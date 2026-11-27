import { expect, test, type Page } from '@playwright/test';

// Full Product CRUD end-to-end against an in-spec STATEFUL mock (Playwright
// page.route) — no backend, no UI lib. Proves the whole Phase-1.1 stack works
// together: routing, RBAC gating, TanStack Query cache invalidation, RHF forms,
// error handling. (Alternative: an MSW browser worker sharing the unit handlers —
// page.route is chosen here to keep the spec self-contained and the 88 unit tests
// untouched.)

interface MockProduct {
  id: string;
  name: string;
  priceCents: number;
  inStock: boolean;
}

// A profile whose permissions unlock the admin module + product write actions, so
// RequireModule and the <Can> guards let the CRUD UI render.
const ADMIN_PROFILE = {
  id: 1,
  email: 'admin@example.com',
  name: 'Admin',
  role: {
    id: 1,
    name: 'admin',
    permissions: [
      { id: 1, name: 'update-product', path: '/products', method: 'PUT', module: 'role' },
      { id: 2, name: 'delete-product', path: '/products', method: 'DELETE', module: 'role' },
    ],
  },
};

// The path under which the build calls the backend: VITE_API_URL defaults to /api,
// which the dev server here, or Caddy on an environment, sends to the API.
const API_PATH = '/api';

async function setupMockedApp(
  page: Page,
  baseURL: string | undefined,
  initial: MockProduct[],
): Promise<void> {
  const products = [...initial];

  // Mock ONLY the backend: /api/* on the origin of the app under test. Matching that path, these
  // routes do NOT intercept SPA navigations such as page.goto('/products'), a document request to
  // /products. The same routes work on the app started here and on Development, where any request
  // they leave alone reaches the real API.
  if (!baseURL) throw new Error('The admin project of playwright.config.ts sets no baseURL.');
  const { origin } = new URL(baseURL);
  const isApi = (url: URL, path: RegExp): boolean =>
    url.origin === origin &&
    url.pathname.startsWith(`${API_PATH}/`) &&
    path.test(url.pathname.slice(API_PATH.length));
  const isProfile = (url: URL): boolean => isApi(url, /^\/profile$/);
  const isProducts = (url: URL): boolean => isApi(url, /^\/products$/);
  const isProductItem = (url: URL): boolean => isApi(url, /^\/products\/[^/]+$/);

  // Seed the auth tokens BEFORE the app loads (string content → no DOM types
  // needed in this Node-typed spec). Keys match src/lib/auth/token-storage.ts.
  await page.addInitScript({
    content:
      "localStorage.setItem('tungph7.auth.access','e2e-access');localStorage.setItem('tungph7.auth.refresh','e2e-refresh');",
  });

  await page.route(isProfile, (route) => route.fulfill({ json: ADMIN_PROFILE }));

  // Collection: GET list + POST create.
  await page.route(isProducts, async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ json: products });
      return;
    }
    if (method === 'POST') {
      const body = route.request().postDataJSON() as Omit<MockProduct, 'id'>;
      const created: MockProduct = { ...body, id: `p-${products.length + 1}` };
      products.push(created);
      await route.fulfill({ json: created });
      return;
    }
    await route.continue();
  });

  // Item: GET detail + PUT update + DELETE.
  await page.route(isProductItem, async (route) => {
    const method = route.request().method();
    const id = route.request().url().split('/products/')[1]!.split('?')[0]!;
    const index = products.findIndex((product) => product.id === id);
    if (method === 'GET') {
      const found = products[index];
      await (found
        ? route.fulfill({ json: found })
        : route.fulfill({ status: 404, json: { message: 'Not found' } }));
      return;
    }
    if (method === 'PUT') {
      const body = route.request().postDataJSON() as Omit<MockProduct, 'id'>;
      const updated: MockProduct = { ...body, id };
      if (index >= 0) products[index] = updated;
      await route.fulfill({ json: updated });
      return;
    }
    if (method === 'DELETE') {
      if (index >= 0) products.splice(index, 1);
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.continue();
  });
}

test('Product CRUD end-to-end (create → read → update → delete)', async ({ page, baseURL }) => {
  await setupMockedApp(page, baseURL, [
    { id: 'p-001', name: 'Seed Widget', priceCents: 1999, inStock: true },
  ]);

  // CREATE — through the RBAC-gated admin form.
  await page.goto('/admin');
  await page.getByLabel('Name').fill('E2E Gadget');
  await page.getByLabel('Price (cents)').fill('2500');
  await page.getByRole('button', { name: 'Create product' }).click();
  await expect(page.getByText('Product created.')).toBeVisible();

  // READ — it shows up in the list.
  await page.goto('/products');
  await expect(page.getByRole('link', { name: 'E2E Gadget' })).toBeVisible();

  // UPDATE — open detail, edit the price, see the new value.
  await page.getByRole('link', { name: 'E2E Gadget' }).click();
  await expect(page).toHaveURL(/\/products\/p-2$/);
  await page.getByRole('link', { name: 'Edit' }).click();
  await page.getByLabel('Price (cents)').fill('9999');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Price: $99.99')).toBeVisible();

  // DELETE — confirm, land back on the list without the product.
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Yes, delete' }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole('link', { name: 'E2E Gadget' })).toHaveCount(0);
});

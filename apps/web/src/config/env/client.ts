import { createEnv } from '@t3-oss/env-nextjs';
import * as z from 'zod';

/**
 * The origin of Production, the default of NEXT_PUBLIC_SITE_URL. A project made with `ao-kit add` writes here the
 * Production host of its web app (`hosts` of web in .ai-orchestrator/project.yaml) in its first Task.
 */
export const PRODUCTION_ORIGIN = 'https://private-car-v1-2.ao.t2g.io.vn';

/**
 * Env phía CLIENT — an toàn cho bundle trình duyệt: CHỈ biến `NEXT_PUBLIC_*` + `shared`.
 *
 * ⭐ Vì sao TÁCH client/server thành 2 file ở folder 15 (folder 07 gộp 1 file):
 *  - File env GỘP làm lọt **tên** biến server (vd `AUTH_SECRET`) vào bundle client — t3-env
 *    chặn ĐỌC giá trị nhưng tên schema vẫn ở đó. Khi đã có secret nhạy cảm → tách để code
 *    client KHÔNG bao giờ tham chiếu schema server.
 *  - `clientEnv` chỉ chứa biến công khai → import từ Client Component an toàn tuyệt đối.
 *  - `server.ts` `extends: [clientEnv]` → code server vẫn có MỘT `env` đủ cả hai phía.
 */
export const clientEnv = createEnv({
  client: {
    // PUBLIC: bị NHÚNG vào bundle trình duyệt → ai cũng đọc được. KHÔNG để secret.
    // ⭐ Folder 21 (SEO): origin CÔNG KHAI của chính site (vd https://tungph7.com) — nguồn cho
    // `metadataBase`, canonical/hreflang, sitemap.xml, robots.txt, og:url. KHÁC API_URL
    // (đó là backend). Public (lộ trong HTML) nên dùng tiền tố NEXT_PUBLIC_.
    // The deployer of ai-orchestrator builds one image for Development, Staging and Production, so a NEXT_PUBLIC_ value
    // is the same in all three. The default is the origin of Production: Development and Staging sit behind basic auth,
    // and their canonical, hreflang and sitemap URLs point search engines to Production. On your machine, set
    // NEXT_PUBLIC_SITE_URL=http://localhost:3000 in .env.development.
    NEXT_PUBLIC_SITE_URL: z.url().default(PRODUCTION_ORIGIN),
  },
  shared: {
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});

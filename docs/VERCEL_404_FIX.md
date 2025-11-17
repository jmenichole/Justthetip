# Vercel 404 Error Fix - Magic Registration Endpoint

## Issue
The Magic wallet registration page at `/api/magic/register-magic.html` was returning a 404 NOT_FOUND error on Vercel production deployment.

## Error Details
```
404: NOT_FOUND
Code: NOT_FOUND
URL: https://justthetip.vercel.app/api/magic/register-magic.html?token=...
```

## Root Cause

### Problem
When Vercel deploys serverless functions using `@vercel/node`, it automatically detects and includes files that are imported via `require()` statements. However, files that are loaded dynamically at runtime using `fs.readFileSync()` are not automatically included in the serverless function bundle.

### Technical Details
1. The Express server in `api/server.js` is the entry point for the serverless function
2. Magic routes are mounted at `/api/magic` using: `app.use('/api/magic', magicRoutes)`
3. The route handler in `api/routes/magicRoutes.js` (line 71) serves the HTML file:
   ```javascript
   router.get('/register-magic.html', (req, res) => {
     const htmlPath = path.join(__dirname, '../public/register-magic.html');
     let html = fs.readFileSync(htmlPath, 'utf8');
     // ... inject environment variables and serve
   });
   ```
4. Because the HTML file is read using `fs.readFileSync()` at runtime, Vercel's build process didn't detect it as a dependency
5. Result: The serverless function was deployed without the `api/public/` directory, causing a 404 error

## Solution

### Changes Made
Updated `vercel.json` to explicitly include necessary directories in the serverless function build:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/server.js",
      "use": "@vercel/node",
      "config": {
        "includeFiles": [
          "api/public/**",
          "api/routes/**",
          "api/middleware/**"
        ]
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "docs/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### What This Does
- `includeFiles` array tells Vercel to explicitly include these directories in the serverless function bundle
- `api/public/**` includes all static files (HTML, JS, etc.) in the public directory
- `api/routes/**` includes all route module files
- `api/middleware/**` includes all middleware files

## Verification

### Local Testing
The endpoint works correctly on local development:
```bash
curl http://localhost:3000/api/magic/register-magic.html
# Returns: 200 OK with HTML content
```

### Production Testing
After deploying this fix to Vercel, the endpoint should return 200 OK:
```bash
curl https://justthetip.vercel.app/api/magic/register-magic.html
# Expected: 200 OK with HTML content
```

## Prevention

### Best Practices for Vercel Deployments
1. **Explicit File Inclusion**: When using `fs.readFile*()` to load files at runtime, always include those directories in `vercel.json`
2. **Test Locally First**: The endpoint worked locally, which helped identify it was a deployment configuration issue
3. **Use Static Serving When Possible**: For truly static files that don't need variable injection, consider serving them via `express.static()` which Vercel handles automatically
4. **Document Dynamic File Loading**: Add comments in code where files are loaded dynamically to remind future developers about Vercel configuration requirements

### Similar Issues to Watch For
If you encounter 404 errors on Vercel but the routes work locally, check:
1. Are you using `fs.readFile*()` to load files at runtime?
2. Are those directories included in `vercel.json` `includeFiles`?
3. Are the file paths correct relative to `__dirname`?
4. Does the serverless function have access to the necessary files?

## Related Files
- `vercel.json` - Vercel deployment configuration
- `api/server.js` - Express server entry point
- `api/routes/magicRoutes.js` - Magic wallet routes including the problematic endpoint
- `api/public/register-magic.html` - The HTML file that wasn't being included
- `docs/VERCEL_USAGE_GUIDE.md` - General Vercel deployment guide

## References
- [Vercel Node.js Runtime](https://vercel.com/docs/runtimes/node-js)
- [Vercel Configuration includeFiles](https://vercel.com/docs/project-configuration#includefiles)
- [Express.js Static Files](https://expressjs.com/en/starter/static-files.html)

## Status
✅ **FIXED** - The configuration has been updated and the endpoint should now work correctly on Vercel production deployments.

## Deployment Notes
After merging this PR, Vercel will automatically redeploy with the new configuration. The next deployment will include all necessary files in the serverless function bundle.

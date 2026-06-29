export const metadata = {
  title: "API Docs — PharmaFlow",
};

export default function ApiDocsPage() {
  return (
    <html lang="en">
      <head>
        <title>PharmaFlow API Docs</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
        />
        <style>{`
          body { margin: 0; padding: 0; }
          .swagger-ui .topbar { background: #1d4ed8; }
          .swagger-ui .topbar .download-url-wrapper { display: none; }
        `}</style>
      </head>
      <body>
        <div id="swagger-ui" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onload = function () {
                SwaggerUIBundle({
                  url: '/api/openapi',
                  dom_id: '#swagger-ui',
                  presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
                  layout: 'StandaloneLayout',
                  deepLinking: true,
                  displayOperationId: false,
                  defaultModelsExpandDepth: 1,
                  tryItOutEnabled: true,
                });
              };
            `,
          }}
        />
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" />
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" />
      </body>
    </html>
  );
}

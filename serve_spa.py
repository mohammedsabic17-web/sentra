from http.server import SimpleHTTPRequestHandler, HTTPServer
import os
import sys

class SPAHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        # Translate path to filesystem
        path = self.translate_path(self.path)
        if os.path.exists(path) and not os.path.isdir(path):
            return super().send_head()
        # Fallback to index.html for SPA routes
        self.path = '/index.html'
        return super().send_head()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    webdir = os.path.join(os.getcwd(), 'frontend', 'dist')
    os.chdir(webdir)
    server = HTTPServer(('0.0.0.0', port), SPAHandler)
    print(f"Serving SPA from {webdir} at http://0.0.0.0:{port}")
    server.serve_forever()

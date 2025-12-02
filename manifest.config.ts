import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
    manifest_version: 3,
    name: "Chat Indexer",
    version: "1.0.0",
    description: "Index and navigate AI chat conversations.",
    permissions: [
        "sidePanel",
        "storage",
        "activeTab",
        "scripting"
    ],
    host_permissions: [
        "<all_urls>"
    ],
    side_panel: {
        default_path: "src/sidepanel/index.html"
    },
    background: {
        service_worker: "src/background/index.ts",
        type: "module"
    },
    content_scripts: [
        {
            matches: ["<all_urls>"],
            js: ["src/content/index.ts"]
        }
    ],
    action: {
        default_title: "Open Chat Indexer"
    }
})

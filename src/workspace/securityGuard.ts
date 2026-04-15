
export const DEFAULT_EXCLUDES = [
    ".git",
    "node_modules",
    ".DS_Store",
    "dist",
    "build",
    "coverage",
    ".next",
    ".turbo"
];

export const SOURCE_EXTENSIONS = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".sql",
    ".json",
    ".md"
]);

export const SENSITIVE_EXTENSIONS = new Set([
    ".pem",
    ".key",
    ".p12",
    ".pfx",
    ".keystore",
    ".jks",
]);

export const EXCLUDED_DIRECTORIES = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
    ".next",
    ".turbo"
]);

export const SENSITIVE_BASENAMES = new Set([
    ".env",
    ".npmrc",
    ".pypirc",
    ".netrc",
    ".dockercfg",
    ".aws",          // directory name, handled below
    ".ssh",          // directory name, handled below
    "id_rsa",
    "id_dsa",
    "id_ecdsa",
    "id_ed25519",
    "known_hosts",   // not always secret, but sensitive enough for agents
    "config",        // only sensitive if inside .ssh; handled below
]);

export const SENSITIVE_PATTERNS: RegExp[] = [
    // .env and any variant: .env.local, .env.production, etc.
    /^\.env(\..+)?$/i,

    // Private keys by filename (covers e.g., id_rsa, id_ed25519)
    /^id_(rsa|dsa|ecdsa|ed25519)$/i,

    // Key/cert bundles
    /\.(pem|key|p12|pfx|keystore|jks)$/i,

    // GitHub / token-ish files we might want to block (optional)
    // /^\.github\/workflows\/.*$/i, // <-- usually NOT sensitive; don't enable unless we have reason
];

function normalizeRelativePath(input: string): string {
    // 1) Trim whitespace & strip null bytes
    let p = input.trim().replace(/\0/g, "");

    // 2) Convert Windows slashes to posix for consistent splitting
    p = p.replace(/\\/g, "/");

    // 3) Remove any leading "./" sequences
    while (p.startsWith("./")) p = p.slice(2);

    // 4) Collapse repeated slashes
    p = p.replace(/\/+/g, "/");

    // 5) Strip trailing slash (so basename extraction is stable)
    if (p.endsWith("/") && p.length > 1) p = p.slice(0, -1);

    return p;
}

export function isSensitivePath(relativePath: string): boolean {
    // Be safe on non-string-ish callers
    if (!relativePath) return false;

    const normalized = normalizeRelativePath(relativePath);

    // Quick reject: obvious traversal tokens
    // Even if resolveSafePath blocks escape, this prevents weird indexing / matching bypasses.
    const segmentsRaw = normalized.split("/");

    // Remove empty segments (from leading '/')
    const segments = segmentsRaw.filter(Boolean);

    // If someone passes "/" or "." etc.
    if (segments.length === 0) return false;

    // Case-fold for comparisons (Windows/macOS friendliness)
    const lowerSegments = segments.map((s) => s.toLowerCase());

    // Block excluded directories anywhere in path
    if (lowerSegments.some((seg) => EXCLUDED_DIRECTORIES.has(seg))) {
        return true;
    }

    // Block common credential directories anywhere in path
    // (These are often outside repos, but if they show up, treat as sensitive.)
    if (lowerSegments.some((seg) => seg === ".ssh" || seg === ".aws")) {
        return true;
    }

    // Basename checks
    const base = lowerSegments[lowerSegments.length - 1];

    // Block known sensitive basenames and .env variants
    if (SENSITIVE_BASENAMES.has(base)) {
        return true;
    }

    // Extra: anything starting with ".env."
    if (base.startsWith(".env.")) {
        return true;
    }

    // Extension checks
    const dot = base.lastIndexOf(".");
    const ext = dot >= 0 ? base.slice(dot) : "";
    if (ext && SENSITIVE_EXTENSIONS.has(ext)) {
        return true;
    }

    // Regex patterns (catch-all)
    if (SENSITIVE_PATTERNS.some((re) => re.test(base))) {
        return true;
    }

    // Optional hardening: block any file that looks like a private key by content name
    // Example: "server.private.key"
    if (base.includes("private") && (base.endsWith(".key") || base.endsWith(".pem"))) {
        return true;
    }

    return false;
}
from fastapi import Request, HTTPException

def extract_subdomain(host: str):
    if not host:
        return None

    # remove port
    host = host.split(":")[0]
    parts = host.split(".")

    # For localhost / lvh.me checking
    # e.g., acme.lvh.me has parts ['acme', 'lvh', 'me'], length 3. Subdomain is parts[0] = 'acme'
    # If host is just localhost or lvh.me, length is <= 2, meaning no subdomain.
    if len(parts) < 3:
        return None

    # Ignore 'www' as a tenant subdomain
    if parts[0] == "www":
        return None

    return parts[0]


async def tenant_middleware(request: Request, call_next):
    # 1. Check if it's a public/platform route that doesn't need tenant isolation
    path = request.url.path
    public_prefixes = [
        "/",
        "/health",
        "/db-test",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/api/tenants/register",
        "/api/tenants/check-slug"
    ]
    
    is_public = any(path == p or path.startswith(p + "/") or path.startswith(p) for p in public_prefixes)
    
    # 2. Extract tenant identifier
    # Priority 1: X-Tenant-Id header
    tenant_id = request.headers.get("X-Tenant-Id")
    
    # Priority 2: Host subdomain
    if not tenant_id:
        host = request.headers.get("host")
        tenant_id = extract_subdomain(host)

    # 3. Handle validation
    if not tenant_id and not is_public:
        raise HTTPException(
            status_code=400, 
            detail="Tenant identifier missing. Provide custom subdomain or X-Tenant-Id header."
        )

    # Attach tenant ID to request state (will be None for public routes if not provided)
    request.state.tenant_id = tenant_id

    return await call_next(request)
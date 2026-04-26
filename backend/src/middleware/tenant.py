from fastapi import Request, HTTPException

def extract_subdomain(host: str):
    if not host:
        return None

    # remove port
    host = host.split(":")[0]

    parts = host.split(".")

    # localhost case
    if len(parts) < 3:
        return None

    return parts[0]


async def tenant_middleware(request: Request, call_next):
    host = request.headers.get("host")
    subdomain = extract_subdomain(host)

    if not subdomain:
        raise HTTPException(status_code=400, detail="Invalid tenant domain")

    request.state.tenant_id = subdomain

    return await call_next(request)
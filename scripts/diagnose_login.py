from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    page.on("console", lambda m: print(f"CONSOLE {m.type}: {m.text}"))
    page.on("request", lambda r: print(f"REQ: {r.method} {r.url}"))
    page.on("response", lambda r: print(f"RESP: {r.status} {r.url}"))
    page.on("requestfailed", lambda r: print(f"REQ FAILED: {r.url} - {r.failure}"))

    page.goto('http://localhost:5173/login', wait_until='domcontentloaded')
    page.wait_for_selector("#id_email")
    page.fill("#id_email", "patient@careconnect.health")
    page.fill("#id_password", "PatientPass123!")
    page.click("button[type='submit']")
    page.wait_for_timeout(3000)

    url = page.url
    token = page.evaluate("() => localStorage.getItem('access_token')")
    user = page.evaluate("() => localStorage.getItem('user')")

    print(f"Current URL: {url}")
    print(f"Access Token: {token[:20] if token else None}")
    print(f"User Object: {user}")

    browser.close()

    url = page.url
    token = page.evaluate("() => localStorage.getItem('access_token')")
    user = page.evaluate("() => localStorage.getItem('user')")

    print(f"Current URL: {url}")
    print(f"Access Token: {token[:20] if token else None}")
    print(f"User Object: {user}")

    browser.close()

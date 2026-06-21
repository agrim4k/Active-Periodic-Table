import asyncio
from playwright.async_api import async_playwright

async def screenshot():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://localhost:8000")
        await page.click("#templates-trigger")
        await asyncio.sleep(1)
        await page.screenshot(path="final_templates_check.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(screenshot())

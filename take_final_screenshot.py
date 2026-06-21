import asyncio
from playwright.async_api import async_playwright

async def screenshot():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://localhost:8000")

        # Add a title
        await page.click("button[data-tab='titles']")
        await page.fill("#title-text", "FINAL VERIFY")
        await page.click("#add-title-btn")
        await asyncio.sleep(1)

        # Click the clip to show format panel
        await page.click(".clip")
        await asyncio.sleep(1)

        # Open templates to show both
        await page.click("#templates-trigger")
        await asyncio.sleep(1)

        await page.screenshot(path="final_combined_verification.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(screenshot())

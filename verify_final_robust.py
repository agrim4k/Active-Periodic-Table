import asyncio
from playwright.async_api import async_playwright
import os

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Open the local server
        url = "http://localhost:8000"
        await page.goto(url)
        await asyncio.sleep(1)

        # 1. Verify Buttons Existence
        print("Verifying button existence...")
        templates_btn = page.locator("#templates-trigger")
        menu_btn = page.locator("#menu-trigger")
        text_format_btn = page.locator("#text-format-trigger")

        await asyncio.sleep(1)
        assert await templates_btn.is_visible(), "Templates button not visible"
        assert await menu_btn.is_visible(), "Menu button not visible"
        assert await text_format_btn.is_visible(), "Text Format button not visible"
        print("Buttons verified.")

        # 2. Add a Title Clip
        print("Adding a title clip...")
        await page.click("button[data-tab='titles']")
        await page.fill("#title-text", "VERIFY TEXT")
        await page.click("#add-title-btn")
        await asyncio.sleep(1)

        # 3. Verify Clip in Timeline and Click it
        print("Verifying clip in timeline...")
        clip = page.locator(".clip").first
        assert await clip.is_visible(), "Clip not found in timeline"

        # Ensure panels are closed so they don't intercept
        await page.evaluate("document.getElementById('templates-panel').style.display = 'none'")
        await page.evaluate("document.getElementById('menu-panel').style.display = 'none'")

        await clip.click()
        await asyncio.sleep(1)

        # 4. Verify Text Format Panel Visibility
        print("Verifying Text Format Panel...")
        format_panel = page.locator("#text-format-panel")
        # The panel should show up when text clip is clicked
        assert await format_panel.is_visible(), "Text Format Panel should be visible after clicking text clip"
        print("Text Format Panel verified.")

        # 5. Change Formatting
        print("Changing formatting...")
        await page.select_option("#fmt-type", "neon")
        await page.click("#fmt-bold")
        await asyncio.sleep(1)
        # Check if active class applied
        assert "active" in await page.get_attribute("#fmt-bold", "class"), "Bold button should be active"
        print("Formatting changes verified.")

        # 6. Verify Deletion (Last Pressed)
        print("Verifying deletion...")
        await page.click("#delete-btn")
        await asyncio.sleep(1)
        assert await page.locator(".clip").count() == 0, "Clip should be deleted"
        print("Deletion verified.")

        # 7. Verify Menu
        print("Verifying Menu...")
        await page.click("#menu-trigger")
        await asyncio.sleep(0.5)
        menu_panel = page.locator("#menu-panel")
        assert await menu_panel.is_visible(), "Menu panel should be visible"

        # Test "Sequence" action (resets time)
        await page.evaluate("state.currentTime = 5")
        await page.click("text=Sequence")
        await asyncio.sleep(0.5)
        current_time = await page.evaluate("state.currentTime")
        assert current_time == 0, f"Sequence should reset time to 0, got {current_time}"
        print("Menu action verified.")

        # 8. Verify Templates Demo
        print("Verifying Templates Demo...")
        await page.click("#templates-trigger")
        await asyncio.sleep(0.5)
        await page.click(".template-card >> text=Adobe Motion Graphics Intro")
        await asyncio.sleep(0.5)
        last_pressed = await page.evaluate("state.lastPressedElementId")
        assert last_pressed == "tpl-mg-intro", f"Last pressed should be tpl-mg-intro, got {last_pressed}"
        print("Templates demo verified.")

        await browser.close()
        print("Verification successful!")

if __name__ == "__main__":
    asyncio.run(verify())

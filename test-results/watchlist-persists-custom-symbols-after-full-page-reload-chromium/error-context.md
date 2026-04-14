# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: watchlist.spec.ts >> persists custom symbols after full page reload
- Location: e2e\watchlist.spec.ts:48:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('NFLX').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByText('NFLX').first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e7]: MHTERM
      - generic [ref=e9]:
        - generic [ref=e10]: PORTFOLIO
        - generic [ref=e11]: $100,000.00
      - generic [ref=e13]:
        - generic [ref=e14]: Day P&L
        - generic [ref=e15]: +$1,000.00 (+1.01%)
      - generic [ref=e17]:
        - generic [ref=e18]: Cash
        - generic [ref=e19]: $25.0K
      - generic [ref=e20]:
        - generic [ref=e21]: Options BP
        - generic [ref=e22]: $0.00
      - generic [ref=e25]: DISCONNECTED
      - generic [ref=e26]:
        - generic [ref=e27]: SINGAPORE
        - generic [ref=e28]: 22:11:03
      - generic [ref=e30]:
        - generic [ref=e31]: NEW YORK
        - generic [ref=e32]: 10:11:03
    - generic [ref=e33]:
      - generic [ref=e34]: WATCHLIST
      - generic [ref=e35]:
        - generic [ref=e37] [cursor=pointer]:
          - generic [ref=e39]: SPY
          - generic [ref=e41]: $450.00
        - generic [ref=e43] [cursor=pointer]:
          - generic [ref=e45]: QQQ
          - generic [ref=e47]: $450.00
        - generic [ref=e49] [cursor=pointer]:
          - generic [ref=e51]: NVDA
          - generic [ref=e53]: $450.00
        - generic [ref=e55] [cursor=pointer]:
          - generic [ref=e57]: META
          - generic [ref=e59]: $450.00
        - generic [ref=e61] [cursor=pointer]:
          - generic [ref=e63]: TSLA
          - generic [ref=e65]: $450.00
        - generic [ref=e67] [cursor=pointer]:
          - generic [ref=e69]: AAPL
          - generic [ref=e71]: $450.00
        - generic [ref=e73] [cursor=pointer]:
          - generic [ref=e75]: MSFT
          - generic [ref=e77]: $450.00
        - generic [ref=e79] [cursor=pointer]:
          - generic [ref=e81]: AVGO
          - generic [ref=e83]: $450.00
        - generic [ref=e85] [cursor=pointer]:
          - generic [ref=e87]: TSM
          - generic [ref=e89]: $450.00
        - generic [ref=e91] [cursor=pointer]:
          - generic [ref=e93]: PANW
          - generic [ref=e95]: $450.00
      - button "+" [ref=e97] [cursor=pointer]
    - generic [ref=e98]:
      - generic [ref=e99]:
        - generic [ref=e101]:
          - generic [ref=e102]:
            - generic [ref=e103]: Positions
            - generic [ref=e104]:
              - generic [ref=e105]: 0 pos
              - generic [ref=e106]: MV $0.00
              - generic [ref=e107]: +$0.00 P&L
          - generic [ref=e109]: No open positions
        - generic [ref=e113]:
          - generic [ref=e114]:
            - generic [ref=e115]: Orders
            - generic [ref=e116]:
              - button "Open" [ref=e117] [cursor=pointer]
              - button "Recent" [ref=e118] [cursor=pointer]
              - generic [ref=e119]: "0"
          - generic [ref=e121]: No open orders
      - generic [ref=e124]:
        - generic [ref=e126]:
          - generic [ref=e127]:
            - generic [ref=e128]: SPY
            - generic [ref=e129]:
              - button "1Min" [ref=e130] [cursor=pointer]
              - button "5Min" [ref=e131] [cursor=pointer]
              - button "15Min" [ref=e132] [cursor=pointer]
              - button "1H" [ref=e133] [cursor=pointer]
              - button "1D" [ref=e134] [cursor=pointer]
          - table [ref=e137]:
            - row [ref=e138]:
              - cell
              - cell [ref=e139]
              - cell [ref=e143]
            - row [ref=e147]:
              - cell
              - cell [ref=e148]
              - cell [ref=e152]
        - generic [ref=e158]:
          - generic [ref=e159]:
            - generic [ref=e160]: Analytics
            - generic [ref=e161]:
              - button "GREEKS" [ref=e162] [cursor=pointer]
              - button "RISK" [ref=e163] [cursor=pointer]
              - button "ATTRIBUTION" [ref=e164] [cursor=pointer]
              - button "ALERTS" [ref=e165] [cursor=pointer]
              - button "SCENARIO" [ref=e166] [cursor=pointer]
          - generic [ref=e170]: No option positions
      - generic [ref=e174]:
        - generic [ref=e175]:
          - generic [ref=e176]:
            - generic [ref=e177]: Equity Curve
            - generic [ref=e178]: +$2,000.00 (+2.04%)
          - generic [ref=e179]:
            - button "1W" [ref=e180] [cursor=pointer]
            - button "1M" [ref=e181] [cursor=pointer]
            - button "3M" [ref=e182] [cursor=pointer]
            - button "1A" [ref=e183] [cursor=pointer]
        - application [ref=e187]:
          - generic [ref=e193]:
            - generic [ref=e194]:
              - generic [ref=e196]: Jan 1
              - generic [ref=e198]: Jan 2
              - generic [ref=e200]: Jan 3
            - generic [ref=e201]:
              - generic [ref=e203]: 98K
              - generic [ref=e205]: 98K
              - generic [ref=e207]: 99K
              - generic [ref=e209]: 100K
              - generic [ref=e211]: 100K
  - generic [ref=e212]: 98K
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | import { mockApis } from './helpers'
  3   | 
  4   | test.beforeEach(async ({ page }) => {
  5   |   // Clear watchlist storage BEFORE React loads so there's no race condition
  6   |   await page.addInitScript(() => localStorage.removeItem('mhterm_watchlist'))
  7   |   await mockApis(page)
  8   |   await page.goto('/')
  9   |   await expect(page.getByText('WATCHLIST')).toBeVisible({ timeout: 15000 })
  10  | })
  11  | 
  12  | // ── Rendering ─────────────────────────────────────────────────────────────────
  13  | test('renders WATCHLIST bar with default symbols', async ({ page }) => {
  14  |   await expect(page.getByText('WATCHLIST')).toBeVisible()
  15  |   for (const sym of ['SPY', 'QQQ', 'NVDA', 'META', 'TSLA', 'AAPL', 'MSFT']) {
  16  |     await expect(page.getByText(sym).first(), `${sym} missing`).toBeVisible()
  17  |   }
  18  | })
  19  | 
  20  | test('shows + add button', async ({ page }) => {
  21  |   await expect(page.getByTitle('Add symbol')).toBeVisible()
  22  | })
  23  | 
  24  | // ── Add symbol ────────────────────────────────────────────────────────────────
  25  | test('clicking + reveals the TICKER input', async ({ page }) => {
  26  |   await page.getByTitle('Add symbol').click()
  27  |   await expect(page.getByPlaceholder('TICKER')).toBeVisible()
  28  | })
  29  | 
  30  | test('adds a new symbol on Enter', async ({ page }) => {
  31  |   await page.getByTitle('Add symbol').click()
  32  |   await page.getByPlaceholder('TICKER').fill('GOOG')
  33  |   await page.getByPlaceholder('TICKER').press('Enter')
  34  |   await expect(page.getByText('GOOG').first()).toBeVisible()
  35  | })
  36  | 
  37  | test('persists new symbol in localStorage', async ({ page }) => {
  38  |   await page.getByTitle('Add symbol').click()
  39  |   await page.getByPlaceholder('TICKER').fill('AMZN')
  40  |   await page.getByPlaceholder('TICKER').press('Enter')
  41  |   await expect(page.getByText('AMZN').first()).toBeVisible()
  42  |   const saved = await page.evaluate(() =>
  43  |     JSON.parse(localStorage.getItem('mhterm_watchlist') ?? '[]') as string[]
  44  |   )
  45  |   expect(saved).toContain('AMZN')
  46  | })
  47  | 
  48  | test('persists custom symbols after full page reload', async ({ page }) => {
  49  |   await page.getByTitle('Add symbol').click()
  50  |   await page.getByPlaceholder('TICKER').fill('NFLX')
  51  |   await page.getByPlaceholder('TICKER').press('Enter')
  52  |   await expect(page.getByText('NFLX').first()).toBeVisible()
  53  |   await page.reload()
  54  |   await expect(page.getByText('WATCHLIST')).toBeVisible({ timeout: 15000 })
> 55  |   await expect(page.getByText('NFLX').first()).toBeVisible()
      |                                                ^ Error: expect(locator).toBeVisible() failed
  56  | })
  57  | 
  58  | test('does not add a duplicate symbol', async ({ page }) => {
  59  |   await page.getByTitle('Add symbol').click()
  60  |   await page.getByPlaceholder('TICKER').fill('SPY')
  61  |   await page.getByPlaceholder('TICKER').press('Enter')
  62  |   await page.waitForTimeout(300)
  63  |   const saved = await page.evaluate(() =>
  64  |     JSON.parse(localStorage.getItem('mhterm_watchlist') ?? '[]') as string[]
  65  |   )
  66  |   expect(saved.filter(s => s === 'SPY').length).toBeLessThanOrEqual(1)
  67  | })
  68  | 
  69  | test('cancels add with Escape and restores + button', async ({ page }) => {
  70  |   await page.getByTitle('Add symbol').click()
  71  |   await expect(page.getByPlaceholder('TICKER')).toBeVisible()
  72  |   await page.keyboard.press('Escape')
  73  |   await expect(page.getByPlaceholder('TICKER')).not.toBeVisible()
  74  |   await expect(page.getByTitle('Add symbol')).toBeVisible()
  75  | })
  76  | 
  77  | // ── Remove symbol ─────────────────────────────────────────────────────────────
  78  | test('hovering a symbol reveals the ✕ remove button', async ({ page }) => {
  79  |   const watchlist = page.locator('text=WATCHLIST').locator('..')
  80  |   await watchlist.locator('text=SPY').first().hover()
  81  |   await expect(page.getByLabel('Remove SPY')).toBeVisible()
  82  | })
  83  | 
  84  | test('clicking ✕ removes the symbol from the watchlist', async ({ page }) => {
  85  |   const watchlist = page.locator('text=WATCHLIST').locator('..')
  86  |   await watchlist.locator('text=SPY').first().hover()
  87  |   await page.getByLabel('Remove SPY').click()
  88  |   await expect(watchlist.locator('text=SPY')).not.toBeVisible()
  89  | })
  90  | 
  91  | test('removed symbol is deleted from localStorage', async ({ page }) => {
  92  |   const watchlist = page.locator('text=WATCHLIST').locator('..')
  93  |   await watchlist.locator('text=QQQ').first().hover()
  94  |   await page.getByLabel('Remove QQQ').click()
  95  |   await expect(watchlist.locator('text=QQQ')).not.toBeVisible()
  96  |   const saved = await page.evaluate(() =>
  97  |     JSON.parse(localStorage.getItem('mhterm_watchlist') ?? '[]') as string[]
  98  |   )
  99  |   expect(saved).not.toContain('QQQ')
  100 | })
  101 | 
  102 | // ── Click to select ───────────────────────────────────────────────────────────
  103 | test('clicking a symbol updates the price chart title', async ({ page }) => {
  104 |   // Click QQQ in watchlist — PriceChart should change to QQQ
  105 |   const watchlist = page.locator('text=WATCHLIST').locator('..')
  106 |   await watchlist.locator('text=QQQ').first().click()
  107 |   // The PriceChart panel header shows the symbol
  108 |   await expect(page.getByText('QQQ').nth(1)).toBeVisible()
  109 | })
  110 | 
```
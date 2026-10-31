import { test, expect, 开一段临时会话 } from './fixtures.js'

// Keep enough rows to cross Streamdown's default 300px table limit.
const rows = [
  ['方向1', 'α多样性＋群落方差分解', 'GAM/GLMM、db-RDA、varpart、PCNM', '气候/植被/土壤分组'],
  ['方向1', '多尺度解释力对比', '三档缓冲区 ΔR²', '三档同名变量'],
  ['方向2', '距离衰减三要素', 'β~地理＋环境＋时间距离', '环境距离矩阵'],
  ['方向2', '群落构建转变', 'βNTI、RC-bray、NST', '环境梯度'],
  ['方向3', '全国预测制图', 'RF/XGBoost＋空间块CV＋留一年出去CV＋SHAP', '特征矩阵＋全国栅格底图'],
  ['方向4', '网络稳定性与阈值', '共现网络、分段回归', '夜光/不透水面/人口/氮沉降'],
  ['方向4', '时间稳定性', 'CV、稳定性指数', '年际气候波动＋人类压力'],
  ...Array.from({ length: 5 }, (_, i) => ['核验', `补充指标${i + 1}`, '样点、环境与年份对应关系', '核验记录']),
  ['整合', 'SEM因果路径＋主图组', 'piecewiseSEM', '汇总'],
]
const explanation = '三个最关键的决策点在“关键设计决策”表里，这也是这套数据最容易出问题的地方：'
const reply = [
  '| 方向 | 分析内容 | 方法 | 数据 |',
  '| --- | --- | --- | --- |',
  ...rows.map(row => `| ${row.join(' | ')} |`),
  '', explanation, '',
  '1. **两套口径不能混**——空间格局用全样本，且年份作协变量；时间维度只用固定重复样点子集。',
  '2. **留一年出去CV是测点**——性能骤降时检查年份效应与环境信号。',
  '3. **βNTI取决于有没有系统发育树**——没有就采用适用方法，并在论文里说清楚。',
  '', '数据一到就从 d1 开始。',
  // Leave time to inspect the table/body boundary while tokens still arrive.
  '', '后续分析说明。'.repeat(100),
].join('\n')

test.use({ dawnOptions: { reply } })

for (const width of [1400, 900]) {
  test(`长表格与正文、列表不重叠：${width}px，流式、完成及历史重载`, async ({ dawn }, info) => {
    const { page, app } = dawn
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await app.evaluate(({ BrowserWindow }, width) => BrowserWindow.getAllWindows()[0]!.setSize(width, 1000), width)
    await 开一段临时会话(page)
    const composer = page.locator('main.main').getByPlaceholder(/输入问题/)
    await composer.fill('表格正文排版验收，慢慢说')
    await composer.press('Enter')
    const markdown = page.locator('.turn.agent .md').last()
    const table = markdown.locator('table')
    const paragraph = markdown.locator('p').filter({ hasText: explanation })

    async function verifyLayout(stage: string) {
      await expect(table.locator('tbody tr')).toHaveCount(rows.length)
      await paragraph.scrollIntoViewIfNeeded()
      const positions = await markdown.evaluate(root => {
        const table = root.querySelector('table')!
        const body = table.parentElement!
        const paragraph = [...root.querySelectorAll('p')].find(p => p.textContent?.startsWith('三个最关键'))!
        return {
          tableHeight: table.getBoundingClientRect().height,
          tableBottom: table.getBoundingClientRect().bottom,
          bodyBottom: body.getBoundingClientRect().bottom,
          paragraphTop: paragraph.getBoundingClientRect().top,
          listTop: root.querySelector('ol')?.getBoundingClientRect().top,
          paragraphBottom: paragraph.getBoundingClientRect().bottom,
          pageFits: document.documentElement.scrollWidth <= innerWidth,
        }
      })
      await info.attach(`${stage}-geometry`, { body: JSON.stringify(positions, null, 2), contentType: 'application/json' })
      await page.mouse.move(width - 20, 20)
      await expect(page.locator('.sess-hover-card')).toHaveCount(0)
      await page.screenshot({ path: info.outputPath(`${stage}.png`), animations: 'disabled' })
      expect(positions.tableHeight).toBeGreaterThan(300)
      expect(positions.paragraphTop, `${stage}: 正文必须在最后一行表格下方`).toBeGreaterThanOrEqual(positions.tableBottom)
      expect(positions.bodyBottom, `${stage}: 表格容器必须包住所有行`).toBeGreaterThanOrEqual(positions.tableBottom - 1)
      if (positions.listTop !== undefined) expect(positions.listTop).toBeGreaterThanOrEqual(positions.paragraphBottom)
      expect(positions.pageFits).toBe(true)
    }

    await expect(paragraph).toHaveText(explanation)
    await expect(page.locator('.thinking')).not.toHaveCount(0)
    await verifyLayout('streaming')
    await expect(page.locator('.thinking')).toHaveCount(0)
    await expect(markdown.locator('ol > li')).toHaveCount(3)
    await verifyLayout('complete')
    await page.reload()
    // Reload returns to the welcome page; reopen the persisted conversation.
    await page.locator('.session-list .sess-item .row').first().click()
    await expect(paragraph).toHaveText(explanation)
    await verifyLayout('history')
    expect(errors).toEqual([])
  })
}

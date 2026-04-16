import { SOLAR_DEFAULTS } from "@/lib/config/solar";
import type { CalculationExplanation } from "@/types/quote";
import type { GoogleSolarSummary } from "@/types/solar";
import type { PricingPreset } from "@/types/quote";
import type { SystemTopology } from "@/types/bom";
import type { SolarCrossCheckSummary } from "@/lib/solar";

export type AppLocale = "en" | "zh" | "th";

export const LANGUAGE_OPTIONS: Array<{ value: AppLocale; label: string }> = [
  { value: "en", label: "EN" },
  { value: "zh", label: "中文" },
  { value: "th", label: "ไทย" },
];

export const APP_COPY = {
  en: {
    language: {
      title: "Language",
    },
    header: {
      badge: "KSolar Thailand rooftop quote MVP",
      title: "Draw the roof, surface the BOM, and explain ROI in one transparent sales workflow.",
      description:
        "The calculator turns map area into a conservative package recommendation, a code-defined BOM, finance-adjusted pricing, and Thailand-focused ROI outputs without hiding any formula behind UI state.",
    },
    tariff: {
      title: "Tariff assumptions",
      description:
        "Keep the financial inputs editable so policy and customer load assumptions remain visible.",
      ftRate: "FT (THB/kWh)",
      selfUseRatio: "Self-use ratio",
      exportRate: "Export rate (THB/kWh)",
    },
    engineering: {
      title: "Engineering intent",
      description:
        "Area, sizing, BOM, pricing, and finance each live in separate code modules so future debugging stays straightforward.",
    },
    workflow: {
      title: "Sales workflow",
      subtitle: "Guide the rep from site capture to proposal output, one step at a time.",
      summaryTitle: "Workflow progress",
      stepChecklist: "Step checklist",
      proposalTitle: "Proposed outcome",
      projectSnapshot: "Project snapshot",
      stepLabel: "Step",
      doneWhen: "Done when",
      checklistReady: "Ready to move on",
      checklistPending: "Still needs input",
      noProposal: "Complete the roof and system steps to generate a proposal.",
      statusTodo: "Not started",
      statusActive: "In progress",
      statusDone: "Done",
      lockedHint: "Complete the previous step to unlock this section.",
      back: "Back",
      continue: "Continue",
      continueWithCurrent: "Continue with current setup",
      openProposal: "Open proposal",
      step1Check1: "The site is centered on the correct building.",
      step1Check2: "At least one roof face has been outlined.",
      step1Check3: "Gross and usable area look reasonable.",
      step2Check1: "Phase and system mode match the customer site.",
      step2Check2: "Battery posture is confirmed.",
      step2Check3: "Pricing preset is selected.",
      step3Check1: "Tariff assumptions are reviewed.",
      step3Check2: "Finance products are selected or cleared.",
      step3Check3: "Google Solar has been checked when available.",
      step4Check1: "Recommended size and sell price are visible.",
      step4Check2: "Payback and ROI are ready to explain.",
      step4Check3: "BOM and Solar cross-check can be shown to the customer.",
      step1Title: "Capture the roof",
      step1Description: "Find the customer site and outline the roof face you want to quote.",
      step2Title: "Choose the system",
      step2Description: "Set phase, topology, battery posture, and pricing strategy.",
      step3Title: "Validate assumptions",
      step3Description: "Check tariff inputs, finance options, and Google Solar cross-checks.",
      step4Title: "Present the proposal",
      step4Description: "Review the suggested package, pricing, ROI, and hardware breakdown.",
      jumpTo: "Jump to step",
      currentFocus: "Current focus",
      nextAction: "Recommended next action",
      nextActionMap: "Search the site and draw one roof face.",
      nextActionSystem: "Confirm the package direction before showing numbers.",
      nextActionValidation: "Review tariff and Solar validation before presenting the quote.",
      nextActionProposal: "Use this section to present the package, ROI, and BOM to the customer.",
      viable: "Proposal ready",
      reviewNeeded: "Needs review",
      size: "Suggested size",
      payback: "Payback",
      sellPrice: "Sell price",
      netPrice: "Net price",
    },
    map: {
      title: "Roof capture",
      description:
        "Search an address, then choose a simple drawing tool to outline the roof face you want to quote.",
      step1Title: "1. Find site",
      step1Body: "Search an address, use your location, or pan the map to the correct building.",
      step2Title: "2. Choose tool",
      step2Body: "Use rectangle for simple roofs. Use polygon only when the roof shape is irregular.",
      step3Title: "3. Adjust and review",
      step3Body: "Drag the shape to fit the roof. The usable area and quote update automatically.",
      searchPlaceholder: "Search Bangkok address or project site",
      directGeocodeHint:
        "Search now uses direct Google geocoding instead of Places autocomplete to reduce browser-side address lookup errors.",
      rectangleTool: "Rectangle",
      polygonTool: "Polygon",
      panTool: "Pan",
      quickMode: "Quick quote",
      advancedMode: "Advanced draw",
      quickModeHint: "Recommended for sales. Draw one rectangle that roughly fits the roof face.",
      advancedModeHint: "Use polygon only when the roof outline is genuinely irregular.",
      startRectangle: "Start rectangle",
      toolsTitle: "Drawing tools",
      toolHint: "Select one tool, draw one roof face, then stop drawing.",
      undoLast: "Undo last",
      clearAll: "Clear all",
      doneDrawing: "Done drawing",
      find: "Find",
      finding: "Finding...",
      useMyLocation: "Use my location",
      locating: "Locating...",
      useMapCenter: "Use map center",
      grossArea: "Gross area",
      usableArea: "Usable area",
      selectionReady: "Roof captured",
      selectionReadyHint: "Area is updated. Continue to system design, or run Solar analysis later when you are ready.",
      satelliteEnabled: "Satellite drawing enabled",
      demoModeTitle: "Map demo mode",
      demoModeDescription:
        "Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to unlock satellite maps and roof drawing. You can still test the calculator with manual roof area.",
      manualRoofArea: "Manual roof area (m²)",
      manualFallback:
        "Use this fallback while wiring the API key. The ROI engine, BOM logic, and finance calculations are already live.",
      loadingMaps: "Loading Google Maps...",
      slowLoadTitle: "Google Maps is taking longer than expected to load.",
      slowLoadBody: "This usually means a browser-side Maps issue rather than a page crash.",
      slowLoadChecksLabel: "Check these first:",
      slowLoadCheck1: "The browser may be blocking the Maps script or a privacy extension is interfering.",
      slowLoadCheck2: "The API key may need additional Google Maps services or billing enabled.",
      slowLoadCheck3: "HTTP referrer restrictions may not allow `localhost:3000`.",
      slowLoadFallback:
        "You can still use manual roof area mode below while we diagnose the Maps loader.",
      statusGeocoderNotReady: "Google geocoder is not ready yet. Please try again in a moment.",
      statusSearching: (query: string) => `Searching for "${query}"...`,
      statusNoResult:
        "No usable map result was found for that address. Try a more complete address.",
      statusSearchFailed: "Address lookup failed. Please try again.",
      statusCentered: (address: string) => `Map centered on ${address}.`,
      statusNeedAddress: "Enter an address first, or use your current location.",
      statusNoGeolocation: "This browser does not support geolocation.",
      statusRequestingLocation: "Requesting your current location...",
      statusLocationBlocked: "Location access was blocked. You can still search by address.",
      statusLocationTimeout: "Location lookup timed out. Try again or search by address.",
      statusLocationFailed: "Could not determine your location. Try again or search by address.",
      statusCurrentLocation: "Map centered on your current location.",
      statusMapCenterNotReady: "Map center is not ready yet.",
      statusMapCenterSynced: "Google Solar lookup point synced to the current map center.",
    },
    system: {
      title: "System design",
      description: "Keep the commercial logic transparent: select topology first, then pricing posture.",
      singlePhase: "Single Phase",
      threePhase: "Three Phase",
      ongrid: "On-grid",
      ongridDescription: "Simplest CAPEX profile and strongest payback for daytime loads.",
      hybrid: "Hybrid",
      hybridDescription: "Supports battery-ready or backup-oriented residential packages.",
      batteryMode: "Battery mode",
      batteryDescription: "Only available for hybrid systems.",
      noBattery: "No battery",
      withBattery: "With battery",
      pricingPreset: "Pricing preset",
      presetMeta: {
        economic: { label: "Economic", description: "Lean margin posture for price-sensitive residential leads." },
        standard: { label: "Standard", description: "Balanced pricing for mainstream rooftop sales." },
        premium: { label: "Premium", description: "Higher margin posture for brand-led or service-led positioning." },
      } satisfies Record<PricingPreset["id"], { label: string; description: string }>,
    },
    finance: {
      title: "Finance options",
      description:
        "Select subsidies, tax benefits, and affordability plans without hiding how each one impacts ROI.",
      groups: {
        loan: "Loans",
        installment: "Installments",
        subsidy: "Subsidies",
        tax_credit: "Tax benefits",
      },
    },
    roi: {
      title: "ROI snapshot",
      description: "The big number sales needs on-site, backed by transparent formulas and BOM data.",
      noPackage: "No package",
      payback: "Payback",
      paybackDescription: "Net customer price divided by annual bill savings.",
      irr: "IRR",
      irrDescription: "25-year project IRR after subsidy and tax adjustments.",
      annualSavings: "Annual savings",
      monthlyPayment: "Monthly payment",
    },
    solar: {
      title: "Google Solar estimate",
      description:
        "Building-level solar potential from Google Solar API, kept separate from the Thailand ROI engine.",
      analyze: "Analyze roof",
      refresh: "Refresh",
      loading: "Loading...",
      requestPoint: "Request point",
      noPoint: "No Solar lookup point yet. Search an address, move the map, or draw a roof selection first.",
      readyToAnalyze: "The map is positioned. Click Analyze roof when you are ready to check the current roof with Google Solar.",
      staleResult: "The roof or map position changed after the last Solar check. Run Analyze roof again to update the overlay.",
      activeBanner:
        "Google Solar is active for this site. The map base layer remains Google satellite imagery; the solar enhancement appears in the metrics below.",
      whatThisMeans: "What this means for the quote",
      decisionTitle: "Solar decision snapshot",
      manualQuote: "Manual quote",
      googleEstimate: "Google estimate",
      googleRawLayout: "Google 400W reference",
      ksolarEquivalent: "Your sellable panel spec",
      recommendedAction: "Recommended action",
      proceed: "Proceed",
      checkUnderSizing: "Check under-sizing",
      checkOverSizing: "Check over-sizing",
      normalizedNote: (ksolarWp: number, googleWp: number) =>
        `Primary comparison uses your ${ksolarWp}W sellable module. Google's original ${googleWp}W model remains as a technical reference.`,
      ksolarPanelCount: (count: number) => `${count} KSolar panels`,
      sameSpecUnavailable: "No sellable-spec conversion yet",
      deltaUnavailable: "No comparison yet",
      howToUse: "How to use Google Solar here",
      detailBreakdown: "View Solar details",
      imageryQuality: "Imagery quality",
      maxPanelCount: "Max panel count",
      maxArrayArea: "Max array area",
      sunshineHours: "Sunshine hours",
      imageryDate: "Imagery date",
      googlePanelWattage: "Google panel wattage",
      roofModelArea: "Roof model area",
      mapOverlayTitle: "Solar overlay on map",
      roofSegmentsOverlay: "Roof segments",
      googlePanelsOverlay: "Google panel spots",
      nearestBuilding: "Nearest Solar building",
      mapOverlayMatched: "Google Solar is matched to the selected roof.",
      mapOverlayUnmatched: "Google Solar is showing the nearest building, which may not be the roof you selected.",
      mapOverlayManual: "Solar overlay needs a geospatial roof selection, not manual area only.",
      distanceFromSelection: "Distance from selected roof",
      topLayout: "Top Google panel layout",
      panels: "Panels",
      energyDc: "Energy (DC)",
      roofSegments: "Roof segments",
      layoutArea: "Layout area",
      segment: "Segment",
      pitch: "Pitch",
      azimuth: "Azimuth",
      area: "Area",
      sunshineP90: "Sunshine P90",
    },
    quote: {
      solarCrossCheck: "Google Solar cross-check",
      solarCrossCheckDescription:
        "This compares Google's building-level estimate with the current manual roof workflow, so the team can see where the two methods agree or diverge.",
      googlePanelCount: "Google panel count",
      googleAnnualDc: "Google annual DC",
      googleSuggestedSize: "Google suggested size",
      deltaVsQuote: "Delta vs current quote",
      marketBenchmark: "Market benchmark",
      marketBenchmarkDescription: "Reference price corridor:",
      quoteSummary: "Quote summary",
      quoteSummaryDescription: "Clean top-line numbers for sales, with market context for pricing confidence.",
      systemSize: "System size",
      annualGeneration: "Annual generation",
      sellPrice: "Sell price",
      netCustomerPrice: "Net customer price",
      calculationBreakdown: "Calculation breakdown",
    },
    bom: {
      title: "BOM breakdown",
      description:
        "Grouped hardware logic stays visible so sales, engineering, and finance can audit the same quote.",
      lineItems: "Line items",
    },
    calc: {
      roofTitle: "Roof-to-capacity logic",
      roofDescription:
        "Map area is derated first, then converted into standard panel count and conservative package size.",
      generationTitle: "Generation and tariff logic",
      generationDescription:
        "Annual energy is driven by 4.0 sun-hours, 15% system loss, and net-billing savings from self-use plus export.",
      bomTitle: "BOM and price logic",
      bomDescription:
        "All system hardware is built from code-defined templates, then converted into a sell price using preset margin and market guardrails.",
      financeTitle: "Finance and ROI logic",
      financeDescription:
        "Subsidies and tax benefits reduce customer capex. Financing is surfaced separately so affordability does not distort base project ROI.",
      labels: {
        "Gross area (m²)": "Gross area (m²)",
        "Usable area (m²)": "Usable area (m²)",
        "Supported panels": "Supported panels",
        "System size": "System size",
        "Annual generation": "Annual generation",
        "Retail rate": "Retail rate",
        "Self-use ratio": "Self-use ratio",
        "Export rate": "Export rate",
        "Annual bill savings": "Annual bill savings",
        "Hardware cost": "Hardware cost",
        Panels: "Panels",
        Inverter: "Inverter",
        Battery: "Battery",
        "Suggested sell price": "Suggested sell price",
        "Applied subsidy": "Applied subsidy",
        "Tax deduction": "Tax deduction",
        "Net customer price": "Net customer price",
        "Monthly payment": "Monthly payment",
        Payback: "Payback",
        IRR: "IRR",
      },
      warnings: {
        noBom: "No BOM template matches the selected phase, mode, and battery combination.",
        googleSelectionMismatch:
          "Google Solar is not matched to the selected roof. Redraw the roof or re-center the map before trusting the quote.",
      },
    },
  },
  zh: {
    language: { title: "语言" },
    header: {
      badge: "KSolar 泰国屋顶光伏快速报价 MVP",
      title: "画出屋顶、展开 BOM，并在同一流程中解释回本逻辑。",
      description:
        "这个工具把地图面积转成保守装机建议、代码内置 BOM、融资后售价，以及面向泰国市场的 ROI 结果，而且不会把公式藏在界面状态里。",
    },
    tariff: {
      title: "电价假设",
      description: "把金融输入保持可编辑，这样政策变化和客户用电假设都能直接看见。",
      ftRate: "FT（THB/kWh）",
      selfUseRatio: "自发自用比例",
      exportRate: "上网电价（THB/kWh）",
    },
    engineering: {
      title: "工程逻辑",
      description: "面积、选型、BOM、定价和金融逻辑分别独立成模块，后续排查会更直接。",
    },
    workflow: {
      title: "销售工作流",
      subtitle: "把现场报价拆成明确步骤，让业务员一路往下完成输入并输出方案。",
      summaryTitle: "流程进度",
      stepChecklist: "步骤清单",
      proposalTitle: "建议结果",
      projectSnapshot: "项目快照",
      stepLabel: "步骤",
      doneWhen: "完成条件",
      checklistReady: "可以进入下一步",
      checklistPending: "还有内容待确认",
      noProposal: "先完成屋顶和系统步骤，系统才会生成建议方案。",
      statusTodo: "未开始",
      statusActive: "进行中",
      statusDone: "已完成",
      lockedHint: "请先完成上一步，当前步骤才会解锁。",
      back: "上一步",
      continue: "继续下一步",
      continueWithCurrent: "按当前设置继续",
      openProposal: "查看方案",
      step1Check1: "地图已经定位到正确建筑。",
      step1Check2: "至少圈出了一个屋顶坡面。",
      step1Check3: "总面积和可用面积看起来合理。",
      step2Check1: "相位和系统模式与客户现场相符。",
      step2Check2: "是否带电池已经确认。",
      step2Check3: "报价档位已经选定。",
      step3Check1: "电价假设已经检查。",
      step3Check2: "金融产品已勾选或明确不选。",
      step3Check3: "如果 Google Solar 可用，已经完成交叉校验。",
      step4Check1: "建议容量和建议售价已经可展示。",
      step4Check2: "回本期和 ROI 已经可解释。",
      step4Check3: "BOM 与 Solar 校验结果可直接给客户看。",
      step1Title: "圈选屋顶",
      step1Description: "找到客户项目位置，并把要报价的屋顶坡面圈出来。",
      step2Title: "选择系统",
      step2Description: "确认相位、系统模式、电池策略和报价档位。",
      step3Title: "校验假设",
      step3Description: "检查电价输入、金融选项，以及 Google Solar 的交叉验证。",
      step4Title: "输出方案",
      step4Description: "查看建议方案、报价、ROI 和硬件拆解，用于对客户展示。",
      jumpTo: "跳转步骤",
      currentFocus: "当前重点",
      nextAction: "建议下一步",
      nextActionMap: "先搜索地址，并圈选一个屋顶坡面。",
      nextActionSystem: "先确认系统方向，再给客户看价格。",
      nextActionValidation: "展示报价前，先检查电价和 Solar 校验结果。",
      nextActionProposal: "这一部分用于向客户展示方案、回本和 BOM。",
      viable: "方案已可展示",
      reviewNeeded: "需要复核",
      size: "建议容量",
      payback: "回本期",
      sellPrice: "建议售价",
      netPrice: "客户净价",
    },
    map: {
      title: "屋顶圈选",
      description: "先搜地址，再选一个简单绘图工具，把要报价的屋顶坡面圈出来。",
      step1Title: "1. 找到项目点",
      step1Body: "搜索地址、使用当前位置，或者直接拖动地图到目标建筑。",
      step2Title: "2. 选择工具",
      step2Body: "简单屋顶优先用矩形，不规则屋顶再用多边形。",
      step3Title: "3. 微调并确认",
      step3Body: "拖动图形贴合屋顶，系统会自动更新可用面积和报价。",
      searchPlaceholder: "搜索曼谷地址或项目位置",
      directGeocodeHint: "地址搜索现在走直接地理编码，不再依赖 Places 下拉，以减少浏览器侧报错。",
      rectangleTool: "矩形",
      polygonTool: "多边形",
      panTool: "拖动",
      quickMode: "快速报价",
      advancedMode: "高级绘图",
      quickModeHint: "推荐销售现场使用。先画一个大致贴合屋顶坡面的矩形。",
      advancedModeHint: "只有屋顶边界明显不规则时，再切换到多边形。",
      startRectangle: "开始画矩形",
      toolsTitle: "绘图工具",
      toolHint: "一次选一个工具，画完一个屋顶坡面后先停止绘图。",
      undoLast: "撤销上一步",
      clearAll: "清空",
      doneDrawing: "结束绘图",
      find: "查找",
      finding: "查找中...",
      useMyLocation: "用我的位置",
      locating: "定位中...",
      useMapCenter: "用当前地图中心",
      grossArea: "总面积",
      usableArea: "可用面积",
      selectionReady: "屋顶已圈选",
      selectionReadyHint: "面积已经更新。你可以继续到系统方案步骤，或稍后再手动运行 Solar 分析。",
      satelliteEnabled: "卫星地图绘图已开启",
      demoModeTitle: "地图演示模式",
      demoModeDescription: "配置 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` 后可启用卫星地图和屋顶绘图。现在也可以先用手动面积测试报价。",
      manualRoofArea: "手动输入屋顶面积（m²）",
      manualFallback: "在 API key 没完全就绪前，你也可以先用这个模式测试 ROI、BOM 和金融计算。",
      loadingMaps: "Google 地图加载中...",
      slowLoadTitle: "Google 地图加载时间比预期更长。",
      slowLoadBody: "这通常是浏览器侧的地图脚本问题，不一定是页面代码崩溃。",
      slowLoadChecksLabel: "建议优先检查：",
      slowLoadCheck1: "浏览器可能拦截了地图脚本，或隐私插件产生了干扰。",
      slowLoadCheck2: "API key 可能还缺少 Google Maps 服务或 billing。",
      slowLoadCheck3: "HTTP referrer 限制可能没有放行 `localhost:3000`。",
      slowLoadFallback: "排查期间，你仍然可以先用下面的手动面积模式。",
      statusGeocoderNotReady: "Google 地理编码器还没准备好，请稍后再试。",
      statusSearching: (query: string) => `正在搜索“${query}”...`,
      statusNoResult: "这个地址没有返回可用地图结果，建议输入更完整的地址。",
      statusSearchFailed: "地址查询失败，请重试。",
      statusCentered: (address: string) => `地图已定位到 ${address}。`,
      statusNeedAddress: "请先输入地址，或者使用当前位置。",
      statusNoGeolocation: "当前浏览器不支持定位。",
      statusRequestingLocation: "正在请求当前位置...",
      statusLocationBlocked: "定位权限被拒绝，你仍然可以通过地址搜索。",
      statusLocationTimeout: "定位超时，请重试或改用地址搜索。",
      statusLocationFailed: "无法获取当前位置，请重试或改用地址搜索。",
      statusCurrentLocation: "地图已定位到你的当前位置。",
      statusMapCenterNotReady: "地图中心点还没准备好。",
      statusMapCenterSynced: "Google Solar 分析点已同步为当前地图中心。",
    },
    system: {
      title: "系统方案",
      description: "先选系统拓扑，再选报价策略，商业逻辑保持透明。",
      singlePhase: "单相",
      threePhase: "三相",
      ongrid: "并网",
      ongridDescription: "CAPEX 最简单，白天负载场景回本通常更快。",
      hybrid: "混合",
      hybridDescription: "适合带电池预留或备电诉求的家用场景。",
      batteryMode: "电池模式",
      batteryDescription: "只有混合系统可以开启。",
      noBattery: "不带电池",
      withBattery: "带电池",
      pricingPreset: "报价档位",
      presetMeta: {
        economic: { label: "经济型", description: "适合价格敏感型家用客户。" },
        standard: { label: "标准型", description: "适合主流屋顶光伏销售场景。" },
        premium: { label: "高配型", description: "适合品牌和服务导向的项目。" },
      } satisfies Record<PricingPreset["id"], { label: string; description: string }>,
    },
    finance: {
      title: "金融选项",
      description: "可直接勾选补贴、税务优惠和分期方案，同时保持 ROI 影响透明可见。",
      groups: {
        loan: "贷款",
        installment: "分期",
        subsidy: "补贴",
        tax_credit: "税务优惠",
      },
    },
    roi: {
      title: "ROI 概览",
      description: "现场销售最需要看的大数字，同时保留可追溯的 BOM 和公式逻辑。",
      noPackage: "暂无方案",
      payback: "回本期",
      paybackDescription: "客户净价除以年节省电费。",
      irr: "IRR",
      irrDescription: "考虑补贴和税务优惠后的 25 年项目 IRR。",
      annualSavings: "年节省电费",
      monthlyPayment: "月供",
    },
    solar: {
      title: "Google Solar 估算",
      description: "Google Solar 提供建筑级光伏潜力判断，但泰国 ROI 仍由 KSolar 规则引擎负责。",
      analyze: "分析当前屋顶",
      refresh: "刷新",
      loading: "加载中...",
      requestPoint: "分析点",
      noPoint: "还没有 Solar 查询点。请先搜索地址、移动地图或画出屋顶区域。",
      readyToAnalyze: "地图位置已经准备好。等你确认当前屋顶后，再点击“分析当前屋顶”调用 Google Solar。",
      staleResult: "你在上次 Solar 分析后又改了地图位置或屋顶范围。请重新点击“分析当前屋顶”更新覆盖层。",
      activeBanner: "当前地址已启用 Google Solar。底图仍然是 Google 卫星图，Solar 的增强信息会显示在下面这些指标里。",
      whatThisMeans: "这对报价意味着什么",
      decisionTitle: "Solar 快速判断",
      manualQuote: "KSolar 报价",
      googleEstimate: "Google 估算",
      googleRawLayout: "Google 400W 参考值",
      ksolarEquivalent: "按你的可售板型换算",
      recommendedAction: "建议动作",
      proceed: "可继续",
      checkUnderSizing: "检查是否偏小",
      checkOverSizing: "检查是否偏大",
      normalizedNote: (ksolarWp: number, googleWp: number) =>
        `主比较口径已经改成你的 ${ksolarWp}W 可销售组件，Google 原始 ${googleWp}W 模型只保留作技术参考。`,
      ksolarPanelCount: (count: number) => `约 ${count} 块 KSolar 组件`,
      sameSpecUnavailable: "暂时无法按可售板型换算",
      deltaUnavailable: "暂时没有可比差值",
      howToUse: "Google Solar 的正确用法",
      detailBreakdown: "查看 Solar 详细信息",
      imageryQuality: "影像质量",
      maxPanelCount: "最大板数",
      maxArrayArea: "最大可铺面积",
      sunshineHours: "年日照时数",
      imageryDate: "影像日期",
      googlePanelWattage: "Google 组件功率",
      roofModelArea: "屋顶模型面积",
      mapOverlayTitle: "地图上的 Solar 方案",
      roofSegmentsOverlay: "屋顶分段",
      googlePanelsOverlay: "Google 板位点",
      nearestBuilding: "Google 最近建筑",
      mapOverlayMatched: "当前 Google Solar 已匹配到你圈选的屋顶。",
      mapOverlayUnmatched: "当前 Google Solar 显示的是最近建筑，可能不是你圈选的这个屋顶。",
      mapOverlayManual: "只有真实地图圈选的屋顶，才能叠加 Solar 方案；手动面积模式不支持。",
      distanceFromSelection: "距圈选屋顶距离",
      topLayout: "Google 推荐布局",
      panels: "组件数",
      energyDc: "发电量（DC）",
      roofSegments: "屋顶分段",
      layoutArea: "布局面积",
      segment: "分段",
      pitch: "坡度",
      azimuth: "朝向",
      area: "面积",
      sunshineP90: "P90 日照",
    },
    quote: {
      solarCrossCheck: "Google Solar 交叉校验",
      solarCrossCheckDescription: "把 Google 的建筑级屋顶判断和当前手动画线报价放在一起看，方便团队快速判断两者是否一致。",
      googlePanelCount: "Google 板数",
      googleAnnualDc: "Google 年发电（DC）",
      googleSuggestedSize: "Google 建议容量",
      deltaVsQuote: "与当前报价差值",
      marketBenchmark: "市场参考",
      marketBenchmarkDescription: "参考价格区间：",
      quoteSummary: "报价摘要",
      quoteSummaryDescription: "给销售看的核心数字，同时保留市场参考。",
      systemSize: "系统容量",
      annualGeneration: "年发电量",
      sellPrice: "建议售价",
      netCustomerPrice: "客户净价",
      calculationBreakdown: "计算拆解",
    },
    bom: {
      title: "BOM 拆解",
      description: "把硬件逻辑按分类展开，销售、工程和财务可以基于同一份报价一起复核。",
      lineItems: "明细项",
    },
    calc: {
      roofTitle: "面积到容量逻辑",
      roofDescription: "先按可用率折减屋顶面积，再换算成组件数量和保守容量档位。",
      generationTitle: "发电与电价逻辑",
      generationDescription: "年发电量由 4.0 小时日照、15% 系统损耗，以及自发自用和上网电量共同决定。",
      bomTitle: "BOM 与定价逻辑",
      bomDescription: "系统硬件来自代码内置模板，再结合毛利规则和市场护栏生成建议售价。",
      financeTitle: "金融与回报逻辑",
      financeDescription: "补贴和税务优惠会降低客户 CAPEX，融资则单独展示，不去扭曲项目基础 ROI。",
      labels: {
        "Gross area (m²)": "总面积 (m²)",
        "Usable area (m²)": "可用面积 (m²)",
        "Supported panels": "可支持组件数",
        "System size": "系统容量",
        "Annual generation": "年发电量",
        "Retail rate": "零售电价",
        "Self-use ratio": "自用比例",
        "Export rate": "上网电价",
        "Annual bill savings": "年节省电费",
        "Hardware cost": "硬件成本",
        Panels: "组件",
        Inverter: "逆变器",
        Battery: "电池",
        "Suggested sell price": "建议售价",
        "Applied subsidy": "补贴抵扣",
        "Tax deduction": "税务优惠",
        "Net customer price": "客户净价",
        "Monthly payment": "月供",
        Payback: "回本期",
        IRR: "IRR",
      },
      warnings: {
        noBom: "当前所选相位、模式和电池组合没有匹配的 BOM 模板。",
        googleSelectionMismatch:
          "Google Solar 当前没有匹配到你圈选的屋顶。请重新圈选屋顶或重新定位地图后，再信任这个报价。",
      },
    },
  },
  th: {
    language: { title: "ภาษา" },
    header: {
      badge: "KSolar MVP ใบเสนอราคาหลังคาโซลาร์สำหรับไทย",
      title: "วาดหลังคา ดู BOM และอธิบาย ROI ได้ในขั้นตอนเดียวที่ตรวจสอบได้",
      description:
        "เครื่องมือนี้แปลงพื้นที่จากแผนที่ให้เป็นข้อเสนอขนาดระบบแบบ conservative, BOM ที่ฝังในโค้ด, ราคาหลังปรับไฟแนนซ์ และผลตอบแทนที่อิงตลาดไทย โดยไม่ซ่อนสูตรไว้หลัง UI",
    },
    tariff: {
      title: "สมมติฐานค่าไฟ",
      description: "ให้ปรับอินพุตทางการเงินได้ตลอด เพื่อให้เห็นสมมติฐานด้านนโยบายและพฤติกรรมการใช้ไฟอย่างชัดเจน",
      ftRate: "FT (บาท/kWh)",
      selfUseRatio: "สัดส่วนใช้เอง",
      exportRate: "อัตราขายไฟกลับ (บาท/kWh)",
    },
    engineering: {
      title: "ตรรกะวิศวกรรม",
      description: "พื้นที่ การเลือกขนาด BOM ราคา และไฟแนนซ์ ถูกแยกเป็นโมดูล ทำให้ตรวจสอบย้อนหลังได้ง่าย",
    },
    workflow: {
      title: "ขั้นตอนการขาย",
      subtitle: "พาทีมขายกรอกข้อมูลจากต้นจนจบ แล้วสร้างข้อเสนอแบบทีละขั้นตอน",
      summaryTitle: "ความคืบหน้าของ workflow",
      stepChecklist: "เช็กลิสต์ขั้นตอน",
      proposalTitle: "ข้อเสนอที่แนะนำ",
      projectSnapshot: "ภาพรวมโครงการ",
      stepLabel: "ขั้นตอน",
      doneWhen: "ถือว่าเสร็จเมื่อ",
      checklistReady: "พร้อมไปขั้นตอนถัดไป",
      checklistPending: "ยังต้องกรอกเพิ่ม",
      noProposal: "ทำขั้นตอนหลังคาและระบบให้ครบก่อน ระบบจึงจะสร้างข้อเสนอได้",
      statusTodo: "ยังไม่เริ่ม",
      statusActive: "กำลังดำเนินการ",
      statusDone: "เสร็จแล้ว",
      lockedHint: "กรุณาทำขั้นตอนก่อนหน้าให้เสร็จเพื่อปลดล็อกส่วนนี้",
      back: "ย้อนกลับ",
      continue: "ทำขั้นตอนถัดไป",
      continueWithCurrent: "ไปต่อด้วยค่าปัจจุบัน",
      openProposal: "เปิดข้อเสนอ",
      step1Check1: "แผนที่อยู่ที่อาคารเป้าหมายแล้ว",
      step1Check2: "มีการวาดผืนหลังคาอย่างน้อยหนึ่งผืน",
      step1Check3: "พื้นที่รวมและพื้นที่ใช้งานดูสมเหตุสมผล",
      step2Check1: "เฟสและโหมดระบบตรงกับไซต์ลูกค้า",
      step2Check2: "ยืนยันแล้วว่าจะมีแบตเตอรี่หรือไม่",
      step2Check3: "เลือกแนวทางราคาแล้ว",
      step3Check1: "ตรวจสมมติฐานค่าไฟแล้ว",
      step3Check2: "เลือกหรือเคลียร์ผลิตภัณฑ์ไฟแนนซ์แล้ว",
      step3Check3: "ตรวจ Google Solar แล้วเมื่อมีข้อมูล",
      step4Check1: "เห็นขนาดระบบและราคาขายที่แนะนำแล้ว",
      step4Check2: "พร้อมอธิบายคืนทุนและ ROI",
      step4Check3: "พร้อมโชว์ BOM และผล cross-check Solar ให้ลูกค้า",
      step1Title: "เก็บข้อมูลหลังคา",
      step1Description: "หาไซต์ลูกค้าและวาดผืนหลังคาที่ต้องการเสนอราคา",
      step2Title: "เลือกระบบ",
      step2Description: "กำหนดเฟส ประเภทระบบ แบตเตอรี่ และแนวทางราคา",
      step3Title: "ตรวจสมมติฐาน",
      step3Description: "ตรวจค่าไฟ ตัวเลือกไฟแนนซ์ และผล cross-check จาก Google Solar",
      step4Title: "นำเสนอข้อเสนอ",
      step4Description: "ดูแพ็กเกจที่แนะนำ ราคา ROI และรายละเอียดฮาร์ดแวร์เพื่อใช้คุยกับลูกค้า",
      jumpTo: "ไปยังขั้นตอน",
      currentFocus: "จุดที่ควรทำตอนนี้",
      nextAction: "ขั้นตอนถัดไปที่แนะนำ",
      nextActionMap: "ค้นหาไซต์และวาดผืนหลังคาหนึ่งผืนก่อน",
      nextActionSystem: "ยืนยันทิศทางของแพ็กเกจก่อนนำเสนอราคา",
      nextActionValidation: "ตรวจค่าไฟและ Solar validation ก่อนโชว์ quote",
      nextActionProposal: "ใช้ส่วนนี้ในการนำเสนอแพ็กเกจ ROI และ BOM กับลูกค้า",
      viable: "พร้อมนำเสนอ",
      reviewNeeded: "ควรตรวจทาน",
      size: "ขนาดที่แนะนำ",
      payback: "คืนทุน",
      sellPrice: "ราคาขาย",
      netPrice: "ราคาสุทธิ",
    },
    map: {
      title: "กำหนดพื้นที่หลังคา",
      description: "ค้นหาที่อยู่ แล้วเลือกเครื่องมือวาดแบบง่ายเพื่อครอบพื้นที่หลังคาที่ต้องการเสนอราคา",
      step1Title: "1. หาไซต์งาน",
      step1Body: "ค้นหาที่อยู่ ใช้ตำแหน่งปัจจุบัน หรือเลื่อนแผนที่ไปยังอาคารเป้าหมาย",
      step2Title: "2. เลือกเครื่องมือ",
      step2Body: "หลังคาทรงง่ายให้ใช้สี่เหลี่ยม ก่อนใช้โพลิกอนกับหลังคาที่รูปทรงซับซ้อน",
      step3Title: "3. ปรับและยืนยัน",
      step3Body: "ลากรูปให้ตรงหลังคา ระบบจะอัปเดตพื้นที่ใช้ได้และใบเสนอราคาอัตโนมัติ",
      searchPlaceholder: "ค้นหาที่อยู่ในกรุงเทพฯ หรือไซต์โครงการ",
      directGeocodeHint:
        "ตอนนี้การค้นหาใช้ geocoding โดยตรง แทน Places autocomplete เพื่อลด error ฝั่งเบราว์เซอร์",
      rectangleTool: "สี่เหลี่ยม",
      polygonTool: "โพลิกอน",
      panTool: "เลื่อนแผนที่",
      quickMode: "เสนอราคาเร็ว",
      advancedMode: "วาดขั้นสูง",
      quickModeHint: "แนะนำสำหรับฝ่ายขาย วาดสี่เหลี่ยมหนึ่งอันให้ครอบผืนหลังคาโดยประมาณ",
      advancedModeHint: "ใช้โพลิกอนเมื่อรูปทรงหลังคาซับซ้อนจริง ๆ เท่านั้น",
      startRectangle: "เริ่มวาดสี่เหลี่ยม",
      toolsTitle: "เครื่องมือวาด",
      toolHint: "เลือกทีละหนึ่งเครื่องมือ วาดหนึ่งผืนหลังคา แล้วค่อยหยุดการวาด",
      undoLast: "ย้อนกลับล่าสุด",
      clearAll: "ล้างทั้งหมด",
      doneDrawing: "เสร็จสิ้นการวาด",
      find: "ค้นหา",
      finding: "กำลังค้นหา...",
      useMyLocation: "ใช้ตำแหน่งฉัน",
      locating: "กำลังระบุตำแหน่ง...",
      useMapCenter: "ใช้จุดกึ่งกลางแผนที่",
      grossArea: "พื้นที่รวม",
      usableArea: "พื้นที่ใช้งานได้",
      selectionReady: "เลือกหลังคาแล้ว",
      selectionReadyHint: "อัปเดตพื้นที่แล้ว ไปต่อที่การออกแบบระบบ หรือค่อยรัน Solar analysis ภายหลังก็ได้",
      satelliteEnabled: "เปิดการวาดบนแผนที่ดาวเทียมแล้ว",
      demoModeTitle: "โหมดสาธิตแผนที่",
      demoModeDescription: "เพิ่ม `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` เพื่อเปิดแผนที่ดาวเทียมและการวาดหลังคา ตอนนี้ยังทดสอบด้วยพื้นที่แบบ manual ได้",
      manualRoofArea: "กรอกพื้นที่หลังคาเอง (m²)",
      manualFallback: "ใช้โหมดนี้ทดสอบ ROI, BOM และไฟแนนซ์ได้ก่อนที่ API key จะพร้อมเต็มรูปแบบ",
      loadingMaps: "กำลังโหลด Google Maps...",
      slowLoadTitle: "Google Maps ใช้เวลาโหลดนานกว่าปกติ",
      slowLoadBody: "โดยมากเป็นปัญหาฝั่งเบราว์เซอร์หรือสคริปต์แผนที่ ไม่ได้แปลว่าโค้ดหน้าเว็บพัง",
      slowLoadChecksLabel: "ตรวจสอบก่อนดังนี้:",
      slowLoadCheck1: "เบราว์เซอร์อาจบล็อกสคริปต์แผนที่ หรือมีส่วนขยาย privacy รบกวน",
      slowLoadCheck2: "API key อาจยังไม่ได้เปิดใช้บริการ Maps หรือ billing ที่จำเป็น",
      slowLoadCheck3: "HTTP referrer restrictions อาจยังไม่อนุญาต `localhost:3000`",
      slowLoadFallback: "ระหว่างตรวจสอบ คุณยังสามารถใช้โหมดกรอกพื้นที่เองด้านล่างได้",
      statusGeocoderNotReady: "Google geocoder ยังไม่พร้อม กรุณาลองใหม่อีกครั้ง",
      statusSearching: (query: string) => `กำลังค้นหา "${query}"...`,
      statusNoResult: "ไม่พบผลลัพธ์แผนที่ที่ใช้งานได้สำหรับที่อยู่นี้ ลองใส่รายละเอียดให้ครบขึ้น",
      statusSearchFailed: "ค้นหาที่อยู่ไม่สำเร็จ กรุณาลองใหม่",
      statusCentered: (address: string) => `เลื่อนแผนที่ไปยัง ${address} แล้ว`,
      statusNeedAddress: "กรุณากรอกที่อยู่ก่อน หรือใช้ตำแหน่งปัจจุบัน",
      statusNoGeolocation: "เบราว์เซอร์นี้ไม่รองรับ geolocation",
      statusRequestingLocation: "กำลังขอตำแหน่งปัจจุบัน...",
      statusLocationBlocked: "การเข้าถึงตำแหน่งถูกปฏิเสธ แต่ยังค้นหาด้วยที่อยู่ได้",
      statusLocationTimeout: "การระบุตำแหน่งหมดเวลา ลองใหม่หรือใช้การค้นหาที่อยู่",
      statusLocationFailed: "ไม่สามารถระบุตำแหน่งได้ ลองใหม่หรือใช้การค้นหาที่อยู่",
      statusCurrentLocation: "เลื่อนแผนที่ไปยังตำแหน่งปัจจุบันแล้ว",
      statusMapCenterNotReady: "จุดกึ่งกลางแผนที่ยังไม่พร้อม",
      statusMapCenterSynced: "ซิงก์จุด Google Solar ให้ตรงกับกึ่งกลางแผนที่แล้ว",
    },
    system: {
      title: "การออกแบบระบบ",
      description: "เลือก topology ก่อน แล้วจึงเลือกแนวทางราคา เพื่อให้ตรรกะเชิงพาณิชย์โปร่งใส",
      singlePhase: "ไฟ 1 เฟส",
      threePhase: "ไฟ 3 เฟส",
      ongrid: "ออนกริด",
      ongridDescription: "โครงสร้าง CAPEX ง่ายที่สุด และมักคืนทุนไวที่สุดสำหรับโหลดกลางวัน",
      hybrid: "ไฮบริด",
      hybridDescription: "รองรับงานบ้านที่ต้องการแบตเตอรี่หรือระบบสำรองไฟ",
      batteryMode: "โหมดแบตเตอรี่",
      batteryDescription: "ใช้ได้เฉพาะระบบไฮบริด",
      noBattery: "ไม่มีแบตเตอรี่",
      withBattery: "มีแบตเตอรี่",
      pricingPreset: "รูปแบบราคา",
      presetMeta: {
        economic: { label: "ประหยัด", description: "เหมาะกับลูกค้าบ้านที่ไวต่อราคา" },
        standard: { label: "มาตรฐาน", description: "เหมาะกับงานขายโซลาร์หลังคาทั่วไป" },
        premium: { label: "พรีเมียม", description: "เหมาะกับงานที่เน้นแบรนด์และบริการ" },
      } satisfies Record<PricingPreset["id"], { label: string; description: string }>,
    },
    finance: {
      title: "ตัวเลือกไฟแนนซ์",
      description: "เลือกเงินอุดหนุน สิทธิประโยชน์ภาษี และแผนผ่อนชำระ โดยยังเห็นผลกระทบต่อ ROI อย่างชัดเจน",
      groups: {
        loan: "สินเชื่อ",
        installment: "ผ่อนชำระ",
        subsidy: "เงินอุดหนุน",
        tax_credit: "สิทธิภาษี",
      },
    },
    roi: {
      title: "ภาพรวม ROI",
      description: "ตัวเลขหลักที่ทีมขายต้องเห็นหน้างาน พร้อมสูตรและ BOM ที่ตรวจสอบได้",
      noPackage: "ยังไม่มีแพ็กเกจ",
      payback: "คืนทุน",
      paybackDescription: "ราคาสุทธิของลูกค้า หารด้วยเงินประหยัดค่าไฟต่อปี",
      irr: "IRR",
      irrDescription: "IRR ของโครงการ 25 ปี หลังหักเงินอุดหนุนและสิทธิภาษี",
      annualSavings: "ประหยัดต่อปี",
      monthlyPayment: "ค่างวดรายเดือน",
    },
    solar: {
      title: "ประมาณการ Google Solar",
      description: "Google Solar ให้มุมมองศักยภาพหลังคาระดับอาคาร แต่ ROI สำหรับไทยยังคำนวณด้วย KSolar rule engine",
      analyze: "วิเคราะห์หลังคานี้",
      refresh: "รีเฟรช",
      loading: "กำลังโหลด...",
      requestPoint: "จุดอ้างอิง",
      noPoint: "ยังไม่มีจุดสำหรับเรียก Solar โปรดค้นหาที่อยู่ เลื่อนแผนที่ หรือวาดพื้นที่หลังคาก่อน",
      readyToAnalyze: "ตำแหน่งบนแผนที่พร้อมแล้ว กดวิเคราะห์หลังคานี้เมื่อคุณพร้อมตรวจหลังคาปัจจุบันด้วย Google Solar",
      staleResult: "มีการเปลี่ยนตำแหน่งแผนที่หรือพื้นที่หลังคาหลังจากเช็ก Solar ครั้งล่าสุด กรุณากดวิเคราะห์หลังคานี้อีกครั้ง",
      activeBanner: "เปิดใช้ Google Solar สำหรับไซต์นี้แล้ว แผนที่พื้นหลังยังเป็นภาพดาวเทียมของ Google และข้อมูล Solar จะปรากฏในตัวเลขด้านล่าง",
      whatThisMeans: "สิ่งนี้มีความหมายต่อใบเสนอราคาอย่างไร",
      decisionTitle: "สรุปเพื่อการตัดสินใจ",
      manualQuote: "ราคา KSolar",
      googleEstimate: "ประมาณการ Google",
      googleRawLayout: "ค่าอ้างอิง Google 400W",
      ksolarEquivalent: "สเปกแผงที่คุณขายจริง",
      recommendedAction: "คำแนะนำ",
      proceed: "ดำเนินต่อ",
      checkUnderSizing: "ตรวจว่าระบบเล็กไปหรือไม่",
      checkOverSizing: "ตรวจว่าระบบใหญ่ไปหรือไม่",
      normalizedNote: (ksolarWp: number, googleWp: number) =>
        `การเทียบหลักใช้แผงขายจริงของคุณ ${ksolarWp}W ส่วนโมเดลดิบของ Google ที่ใช้ ${googleWp}W จะแสดงไว้เป็นข้อมูลอ้างอิง`,
      ksolarPanelCount: (count: number) => `${count} แผงตามสเปก KSolar`,
      sameSpecUnavailable: "ยังแปลงตามสเปกขายจริงไม่ได้",
      deltaUnavailable: "ยังไม่มีค่าส่วนต่าง",
      howToUse: "วิธีใช้ Google Solar ในหน้านี้",
      detailBreakdown: "ดูรายละเอียด Solar",
      imageryQuality: "คุณภาพภาพถ่าย",
      maxPanelCount: "จำนวนแผงสูงสุด",
      maxArrayArea: "พื้นที่วางแผงสูงสุด",
      sunshineHours: "ชั่วโมงแดดต่อปี",
      imageryDate: "วันที่ภาพถ่าย",
      googlePanelWattage: "วัตต์แผงที่ Google ใช้",
      roofModelArea: "พื้นที่โมเดลหลังคา",
      mapOverlayTitle: "แผนผัง Solar บนแผนที่",
      roofSegmentsOverlay: "ส่วนของหลังคา",
      googlePanelsOverlay: "ตำแหน่งแผงของ Google",
      nearestBuilding: "อาคารที่ Google Solar จับได้",
      mapOverlayMatched: "Google Solar จับคู่กับหลังคาที่คุณเลือกแล้ว",
      mapOverlayUnmatched: "Google Solar กำลังแสดงอาคารที่ใกล้ที่สุด ซึ่งอาจไม่ใช่หลังคาที่คุณเลือก",
      mapOverlayManual: "การแสดง Solar overlay ต้องใช้หลังคาที่วาดบนแผนที่จริง ไม่รองรับโหมดกรอกพื้นที่อย่างเดียว",
      distanceFromSelection: "ระยะจากหลังคาที่เลือก",
      topLayout: "เลย์เอาต์แผงที่ Google แนะนำ",
      panels: "จำนวนแผง",
      energyDc: "พลังงาน (DC)",
      roofSegments: "ส่วนของหลังคา",
      layoutArea: "พื้นที่เลย์เอาต์",
      segment: "ส่วนที่",
      pitch: "มุมเอียง",
      azimuth: "ทิศทาง",
      area: "พื้นที่",
      sunshineP90: "แดด P90",
    },
    quote: {
      solarCrossCheck: "ตรวจเทียบกับ Google Solar",
      solarCrossCheckDescription: "เปรียบเทียบการประเมินระดับอาคารของ Google กับ workflow วาดหลังคาแบบ manual เพื่อดูว่าผลสองฝั่งสอดคล้องกันหรือไม่",
      googlePanelCount: "จำนวนแผงของ Google",
      googleAnnualDc: "พลังงานต่อปีของ Google (DC)",
      googleSuggestedSize: "ขนาดที่ Google แนะนำ",
      deltaVsQuote: "ส่วนต่างเทียบกับใบเสนอราคา",
      marketBenchmark: "กรอบราคาอ้างอิงตลาด",
      marketBenchmarkDescription: "ช่วงราคาอ้างอิง:",
      quoteSummary: "สรุปใบเสนอราคา",
      quoteSummaryDescription: "ตัวเลขบนสุดสำหรับทีมขาย พร้อมกรอบอ้างอิงตลาด",
      systemSize: "ขนาดระบบ",
      annualGeneration: "พลังงานต่อปี",
      sellPrice: "ราคาขาย",
      netCustomerPrice: "ราคาสุทธิของลูกค้า",
      calculationBreakdown: "รายละเอียดการคำนวณ",
    },
    bom: {
      title: "สรุป BOM",
      description: "ทำให้ตรรกะฮาร์ดแวร์มองเห็นได้ เพื่อให้ฝ่ายขาย วิศวกรรม และการเงินตรวจสอบ quote เดียวกันได้",
      lineItems: "รายการย่อย",
    },
    calc: {
      roofTitle: "ตรรกะจากหลังคาสู่กำลังติดตั้ง",
      roofDescription: "ลดพื้นที่ด้วย usable factor ก่อน แล้วค่อยแปลงเป็นจำนวนแผงและแพ็กเกจขนาดแบบ conservative",
      generationTitle: "ตรรกะการผลิตและค่าไฟ",
      generationDescription: "พลังงานต่อปีขับเคลื่อนด้วยแดด 4.0 ชั่วโมง สูญเสียระบบ 15% และผลประหยัดจากใช้เองร่วมกับขายกลับ",
      bomTitle: "ตรรกะ BOM และราคา",
      bomDescription: "ฮาร์ดแวร์ทั้งหมดมาจาก template ในโค้ด แล้วแปลงเป็นราคาขายด้วย margin preset และ market guardrails",
      financeTitle: "ตรรกะไฟแนนซ์และ ROI",
      financeDescription: "เงินอุดหนุนและสิทธิภาษีช่วยลด CAPEX ของลูกค้า ส่วนการผ่อนชำระจะแสดงแยกเพื่อไม่บิดเบือน ROI พื้นฐานของโครงการ",
      labels: {
        "Gross area (m²)": "พื้นที่รวม (m²)",
        "Usable area (m²)": "พื้นที่ใช้งานได้ (m²)",
        "Supported panels": "จำนวนแผงที่รองรับ",
        "System size": "ขนาดระบบ",
        "Annual generation": "พลังงานต่อปี",
        "Retail rate": "อัตราค่าไฟ retail",
        "Self-use ratio": "สัดส่วนใช้เอง",
        "Export rate": "อัตราขายไฟกลับ",
        "Annual bill savings": "ประหยัดค่าไฟต่อปี",
        "Hardware cost": "ต้นทุนฮาร์ดแวร์",
        Panels: "แผง",
        Inverter: "อินเวอร์เตอร์",
        Battery: "แบตเตอรี่",
        "Suggested sell price": "ราคาขายที่แนะนำ",
        "Applied subsidy": "เงินอุดหนุน",
        "Tax deduction": "สิทธิลดหย่อนภาษี",
        "Net customer price": "ราคาสุทธิของลูกค้า",
        "Monthly payment": "ค่างวดรายเดือน",
        Payback: "คืนทุน",
        IRR: "IRR",
      },
      warnings: {
        noBom: "ไม่มี BOM template ที่ตรงกับ phase, mode และ battery combination ที่เลือก",
        googleSelectionMismatch:
          "Google Solar ยังไม่ตรงกับหลังคาที่คุณเลือก โปรดวาดหลังคาใหม่หรือจัดตำแหน่งแผนที่ก่อนเชื่อราคาเสนอ",
      },
    },
  },
} as const;

export function getCopy(locale: AppLocale) {
  return APP_COPY[locale];
}

export function localizeWarning(locale: AppLocale, warning: string) {
  const copy = getCopy(locale);
  const roofMatch = warning.match(
    /Selected roof area supports (\d+) panel\(s\), which is below the smallest (1P|3P) standard package\./,
  );

  if (roofMatch) {
    const panelCount = roofMatch[1];
    const phase = roofMatch[2];

    if (locale === "zh") {
      return `当前选中的屋顶面积只支持 ${panelCount} 块组件，低于最小的 ${phase} 标准方案。`;
    }

    if (locale === "th") {
      return `พื้นที่หลังคาที่เลือกตอนนี้รองรับได้เพียง ${panelCount} แผง ซึ่งต่ำกว่าแพ็กเกจมาตรฐานขั้นต่ำของ ${phase}`;
    }
  }

  if (warning === "No BOM template matches the selected phase, mode, and battery combination.") {
    return copy.calc.warnings.noBom;
  }

  if (warning === "Google Solar is not matched to the selected roof. Redraw the roof or re-center the map before trusting the quote.") {
    return copy.calc.warnings.googleSelectionMismatch;
  }

  return warning;
}

export function localizeCalculationEntry(locale: AppLocale, entry: CalculationExplanation): CalculationExplanation {
  const copy = getCopy(locale);
  const labels = copy.calc.labels as Record<string, string>;
  const titleMap: Record<string, { title: string; description: string }> = {
    roof: { title: copy.calc.roofTitle, description: copy.calc.roofDescription },
    generation: { title: copy.calc.generationTitle, description: copy.calc.generationDescription },
    bom: { title: copy.calc.bomTitle, description: copy.calc.bomDescription },
    finance: { title: copy.calc.financeTitle, description: copy.calc.financeDescription },
  };

  return {
    ...entry,
    title: titleMap[entry.key]?.title || entry.title,
    description: titleMap[entry.key]?.description || entry.description,
    metrics: Object.fromEntries(
      Object.entries(entry.metrics).map(([label, value]) => [labels[label] || label, value]),
    ),
  };
}

export function getLocalizedSolarActionSummary(
  locale: AppLocale,
  summary: SolarCrossCheckSummary,
) {
  if (locale === "zh") {
    if (summary.status === "no-layout") {
      return "Google Solar 看到了屋顶潜力，但没有返回明确的铺板布局建议。";
    }
    if (summary.status === "aligned") {
      return "Google Solar 和当前 KSolar 报价大体一致，可以作为报价可信度校验。";
    }
    if (summary.status === "check-under-sizing") {
      return "Google Solar 认为这个屋顶可能还能装更多容量，建议检查当前手动画线是否过于保守。";
    }
    return "Google Solar 认为当前报价容量偏大，建议重新检查屋顶边界、遮挡和可用面积假设。";
  }

  if (locale === "th") {
    if (summary.status === "no-layout") {
      return "Google Solar พบศักยภาพของหลังคา แต่ยังไม่มี layout แผงที่ชัดเจนสำหรับจุดนี้";
    }
    if (summary.status === "aligned") {
      return "Google Solar และราคา KSolar ปัจจุบันสอดคล้องกันในภาพรวม ใช้เป็นตัวตรวจความมั่นใจได้";
    }
    if (summary.status === "check-under-sizing") {
      return "Google Solar มองว่าหลังคานี้อาจติดตั้งได้มากกว่าที่กำลังเสนอ ควรตรวจว่าการวาดหลังคา conservative เกินไปหรือไม่";
    }
    return "Google Solar มองว่าขนาดที่เสนออยู่อาจใหญ่เกินไป ควรตรวจขอบเขตหลังคา เงาบัง และ usable area อีกครั้ง";
  }

  return summary.actionSummary;
}

export function getLocalizedSolarConfidenceSummary(
  locale: AppLocale,
  insights: GoogleSolarSummary,
  fallback: string,
) {
  if (locale === "zh") {
    if (insights.imageryQuality === "HIGH") {
      return "当前是高质量影像，可作为较强的屋顶适配校验依据。";
    }
    if (insights.imageryQuality === "MEDIUM") {
      return "当前是中等质量影像，适合做方向性校验，但复杂屋顶边界仍建议人工复核。";
    }
    return "当前只有 BASE 级影像，更适合做方向性参考，不建议直接当作最终工程结论。";
  }

  if (locale === "th") {
    if (insights.imageryQuality === "HIGH") {
      return "ภาพถ่ายคุณภาพสูง ใช้เป็นตัวตรวจความเหมาะสมของหลังคาได้ค่อนข้างมั่นใจ";
    }
    if (insights.imageryQuality === "MEDIUM") {
      return "ภาพถ่ายคุณภาพปานกลาง เหมาะกับการตรวจเชิงทิศทาง แต่หลังคาซับซ้อนยังควรตรวจมือ";
    }
    return "มีเพียงภาพถ่ายระดับ BASE จึงควรใช้เป็นแนวทาง ไม่ใช่ข้อสรุปทางวิศวกรรมขั้นสุดท้าย";
  }

  return fallback;
}

export function getLocalizedSolarUsageSummary(locale: AppLocale, fallback: string) {
  if (locale === "zh") {
    return "Google Solar 更适合用来校验屋顶可铺性、朝向分段和年发电方向；BOM、售价和泰国 ROI 仍应以 KSolar 规则引擎为准。";
  }

  if (locale === "th") {
    return "ใช้ Google Solar เพื่อเช็กความพอดีของหลังคา ทิศทางแต่ละ segment และแนวโน้มพลังงานต่อปี ส่วน BOM ราคา และ ROI สำหรับไทยยังควรยึด KSolar rule engine";
  }

  return fallback;
}

export function getLocalizedSolarCautionSummary(
  locale: AppLocale,
  insights: GoogleSolarSummary,
  fallback: string,
) {
  if (locale === "zh") {
    return `Google Solar 当前按约 ${insights.panelCapacityWatts}W 组件建模，而 KSolar 当前规则按 ${SOLAR_DEFAULTS.panelPowerWp}W 组件测算。先看同口径换算结果，再决定是否调大或调小方案。`;
  }

  if (locale === "th") {
    return `Google Solar คำนวณจากแผงประมาณ ${insights.panelCapacityWatts}W ขณะที่กฎของ KSolar ตอนนี้ใช้แผง ${SOLAR_DEFAULTS.panelPowerWp}W ควรดูค่าที่แปลงเป็นสเปกเดียวกันก่อนตัดสินว่าระบบใหญ่หรือเล็กเกินไป`;
  }

  return fallback;
}

export function getLocalizedPresetMeta(locale: AppLocale, presetId: PricingPreset["id"]) {
  return getCopy(locale).system.presetMeta[presetId];
}

export function getLocalizedModeLabel(locale: AppLocale, topology: SystemTopology) {
  const copy = getCopy(locale);
  const phaseLabel = topology.phase === "1P" ? copy.system.singlePhase : copy.system.threePhase;
  const modeLabel = topology.mode === "ongrid" ? copy.system.ongrid : copy.system.hybrid;
  return `${phaseLabel} · ${modeLabel}`;
}

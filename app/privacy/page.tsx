import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Database, MapPinned, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LOCALE_COOKIE_NAME, resolveAppLocale, type AppLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "How KSolar currently uses customer information for quotes and sales follow-up.",
};

interface PrivacyCopy {
  back: string;
  dataTitle: string;
  dataDescription: string;
  dataItems: string[];
  deletionTitle: string;
  deletionDescription: string;
  deletionItems: string[];
  eyebrow: string;
  intro: string;
  purposeTitle: string;
  purposeDescription: string;
  purposeItems: string[];
  thirdPartiesTitle: string;
  thirdPartiesDescription: string;
  thirdPartiesItems: string[];
  title: string;
  updated: string;
}

const PRIVACY_COPY: Record<AppLocale, PrivacyCopy> = {
  en: {
    back: "Back to KSolar",
    dataTitle: "Information saved in the CRM",
    dataDescription: "The customer form can save the following categories. Optional fields stay optional.",
    dataItems: [
      "Identity and contact details: customer name, phone, email, and LINE ID.",
      "Site and location details: project address and exact latitude/longitude when the location feature is used.",
      "Electricity and project details: monthly or annual electricity spending, major appliances and quantities, and sales notes.",
      "Optional profile details: age, annual income, and education background.",
    ],
    deletionTitle: "Access, retention, correction, and deletion",
    deletionDescription: "This describes the controls available in the product today.",
    deletionItems: [
      "Records are available inside the CRM to signed-in sales accounts according to the access configured by KSolar. CRM administrators may also access records to operate the system.",
      "Customers do not currently have a self-service page for viewing, correcting, exporting, or deleting their CRM record.",
      "There is currently no automatic deletion schedule. To correct or delete a record, contact the KSolar administrator who manages the relevant sales account or CRM and identify the customer record and requested change.",
    ],
    eyebrow: "Current product behavior",
    intro:
      "KSolar uses customer information only for preparing solar quotes and sales follow-up in the current CRM workflow. A salesperson must obtain the customer's agreement before saving the form.",
    purposeTitle: "Why the information is used",
    purposeDescription: "The current quote workflow uses the information for these operational purposes.",
    purposeItems: [
      "Prepare and revise a rooftop-solar quote, including system assumptions, pricing, financing context, and follow-up notes.",
      "Keep the customer, project site, and quote associated with the signed-in sales record so work can continue later.",
      "Contact the customer about the requested quote and related sales follow-up after consent has been obtained.",
    ],
    thirdPartiesTitle: "Service providers used by KSolar",
    thirdPartiesDescription: "Some information is processed by services needed to operate the product.",
    thirdPartiesItems: [
      "Supabase provides account authentication and CRM database services, so customer records and the associated sales-account identifier can be stored there.",
      "Google Maps, geocoding, and Solar services receive location searches, addresses, or coordinates when those map and solar features are used.",
      "Do not use the location button or save the form if the customer has not agreed to this processing.",
    ],
    title: "Customer privacy notice",
    updated: "Updated 18 July 2026",
  },
  zh: {
    back: "返回 KSolar",
    dataTitle: "CRM 会保存哪些资料",
    dataDescription: "客户表单目前可能保存以下类别；标为可选的字段仍可不填。",
    dataItems: [
      "身份与联系方式：客户姓名、电话、邮箱和 LINE ID。",
      "项目地点与位置：项目地址；使用定位功能时还会保存精确经纬度。",
      "用电与项目资料：月度或年度电费、大型用电器及数量、销售备注。",
      "可选画像资料：年龄、年收入和教育背景。",
    ],
    deletionTitle: "访问、保留、更正与删除",
    deletionDescription: "以下内容描述的是产品目前真实提供的控制方式。",
    deletionItems: [
      "资料会按 KSolar 当前配置的访问权限提供给已登录的销售账号；CRM 管理员也可能为维护系统而访问记录。",
      "客户目前没有自行查看、更正、导出或删除 CRM 记录的自助页面。",
      "系统目前没有自动删除期限。如需更正或删除，请联系管理相关销售账号或 CRM 的 KSolar 管理员，并说明客户记录和希望进行的操作。",
    ],
    eyebrow: "当前产品行为说明",
    intro:
      "KSolar 当前只在报价与销售跟进流程中使用客户资料。销售人员必须先获得客户同意，才能保存这份表单。",
    purposeTitle: "资料用途",
    purposeDescription: "当前报价流程会将资料用于以下业务操作。",
    purposeItems: [
      "制作和修改屋顶光伏报价，包括系统假设、价格、融资背景与跟进备注。",
      "把客户、项目地点和报价关联到已登录的销售记录，方便后续继续处理。",
      "在已获得同意的前提下，就客户请求的报价及相关销售事项进行联系和跟进。",
    ],
    thirdPartiesTitle: "KSolar 使用的服务提供商",
    thirdPartiesDescription: "部分资料会由维持产品运行所需的服务处理。",
    thirdPartiesItems: [
      "Supabase 提供账号认证和 CRM 数据库服务，因此客户记录及关联的销售账号标识会保存在该服务中。",
      "使用地图或光伏分析功能时，Google Maps、地理编码和 Solar 服务会接收位置搜索词、地址或坐标。",
      "如果客户没有同意这些处理，请不要使用定位按钮，也不要保存表单。",
    ],
    title: "客户隐私说明",
    updated: "更新于 2026 年 7 月 18 日",
  },
  th: {
    back: "กลับไปที่ KSolar",
    dataTitle: "ข้อมูลที่บันทึกใน CRM",
    dataDescription: "แบบฟอร์มลูกค้าสามารถบันทึกข้อมูลประเภทต่อไปนี้ โดยช่องที่ระบุว่าไม่บังคับยังคงเว้นว่างได้",
    dataItems: [
      "ข้อมูลระบุตัวตนและการติดต่อ: ชื่อลูกค้า เบอร์โทร อีเมล และ LINE ID",
      "ข้อมูลสถานที่และตำแหน่ง: ที่อยู่โครงการ และพิกัดละติจูด/ลองจิจูดที่แม่นยำเมื่อใช้ฟังก์ชันตำแหน่ง",
      "ข้อมูลการใช้ไฟฟ้าและโครงการ: ค่าไฟรายเดือนหรือรายปี เครื่องใช้ไฟฟ้าหลักและจำนวน รวมถึงบันทึกการขาย",
      "ข้อมูลโปรไฟล์ที่ไม่บังคับ: อายุ รายได้ต่อปี และระดับการศึกษา",
    ],
    deletionTitle: "การเข้าถึง การเก็บรักษา การแก้ไข และการลบ",
    deletionDescription: "ข้อความต่อไปนี้อธิบายความสามารถที่มีอยู่จริงในผลิตภัณฑ์ปัจจุบัน",
    deletionItems: [
      "บัญชีฝ่ายขายที่เข้าสู่ระบบจะเข้าถึงข้อมูลใน CRM ตามสิทธิ์ที่ KSolar ตั้งค่าไว้ และผู้ดูแล CRM อาจเข้าถึงข้อมูลเพื่อดูแลระบบ",
      "ขณะนี้ลูกค้ายังไม่มีหน้าบริการตนเองสำหรับดู แก้ไข ส่งออก หรือลบข้อมูลใน CRM",
      "ขณะนี้ระบบยังไม่มีระยะเวลาลบข้อมูลอัตโนมัติ หากต้องการแก้ไขหรือลบ โปรดติดต่อผู้ดูแล KSolar ที่จัดการบัญชีฝ่ายขายหรือ CRM นั้น พร้อมระบุข้อมูลลูกค้าและรายการที่ต้องการให้ดำเนินการ",
    ],
    eyebrow: "การทำงานของผลิตภัณฑ์ในปัจจุบัน",
    intro:
      "ปัจจุบัน KSolar ใช้ข้อมูลลูกค้าเพื่อจัดทำใบเสนอราคาและติดตามงานขายเท่านั้น พนักงานขายต้องได้รับความยินยอมจากลูกค้าก่อนบันทึกแบบฟอร์ม",
    purposeTitle: "วัตถุประสงค์ในการใช้ข้อมูล",
    purposeDescription: "ขั้นตอนเสนอราคาในปัจจุบันใช้ข้อมูลเพื่อการดำเนินงานต่อไปนี้",
    purposeItems: [
      "จัดทำและแก้ไขใบเสนอราคาโซลาร์บนหลังคา รวมถึงสมมติฐานระบบ ราคา บริบททางการเงิน และบันทึกติดตาม",
      "เชื่อมโยงลูกค้า สถานที่โครงการ และใบเสนอราคากับบันทึกของพนักงานขายที่เข้าสู่ระบบ เพื่อให้ดำเนินงานต่อได้ในภายหลัง",
      "ติดต่อลูกค้าเกี่ยวกับใบเสนอราคาที่ขอและติดตามงานขายที่เกี่ยวข้อง หลังจากได้รับความยินยอมแล้ว",
    ],
    thirdPartiesTitle: "ผู้ให้บริการที่ KSolar ใช้",
    thirdPartiesDescription: "ข้อมูลบางส่วนจะถูกประมวลผลโดยบริการที่จำเป็นต่อการทำงานของผลิตภัณฑ์",
    thirdPartiesItems: [
      "Supabase ให้บริการยืนยันตัวตนบัญชีและฐานข้อมูล CRM จึงมีการเก็บข้อมูลลูกค้าและรหัสบัญชีฝ่ายขายที่เกี่ยวข้องไว้ในบริการนี้",
      "Google Maps บริการแปลงพิกัด และ Solar จะได้รับคำค้นหาตำแหน่ง ที่อยู่ หรือพิกัดเมื่อมีการใช้ฟังก์ชันแผนที่และการวิเคราะห์โซลาร์",
      "หากลูกค้าไม่ยินยอมต่อการประมวลผลนี้ โปรดอย่าใช้ปุ่มตำแหน่งหรือบันทึกแบบฟอร์ม",
    ],
    title: "คำชี้แจงความเป็นส่วนตัวของลูกค้า",
    updated: "ปรับปรุงเมื่อ 18 กรกฎาคม 2026",
  },
};

export default async function PrivacyPage() {
  const cookieStore = await cookies();
  const locale = resolveAppLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  const copy = PRIVACY_COPY[locale];

  return (
    <main className="ksolar-shell min-h-screen px-4 py-8">
      <div className="mx-auto grid max-w-4xl gap-5">
        <header className="premium-panel p-6 sm:p-8">
          <div className="section-kicker">{copy.eyebrow}</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">{copy.intro}</p>
          <p className="mt-3 text-sm font-medium text-muted-foreground">{copy.updated}</p>
        </header>

        <PrivacySection
          icon={UserRound}
          title={copy.dataTitle}
          description={copy.dataDescription}
          items={copy.dataItems}
        />
        <PrivacySection
          icon={ShieldCheck}
          title={copy.purposeTitle}
          description={copy.purposeDescription}
          items={copy.purposeItems}
        />
        <PrivacySection
          icon={Database}
          title={copy.deletionTitle}
          description={copy.deletionDescription}
          items={copy.deletionItems}
        />
        <PrivacySection
          icon={MapPinned}
          title={copy.thirdPartiesTitle}
          description={copy.thirdPartiesDescription}
          items={copy.thirdPartiesItems}
        />

        <div className="flex justify-start">
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="size-4" aria-hidden="true" />
              {copy.back}
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

function PrivacySection({
  icon: Icon,
  title,
  description,
  items,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <Card className="border-white/75 bg-white/92">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-5 text-emerald-700" aria-hidden="true" />
          {title}
        </CardTitle>
        <CardDescription className="text-sm leading-6">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 text-sm leading-6 text-slate-700">
          {items.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

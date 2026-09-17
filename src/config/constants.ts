import { BasicFieldType } from "@/types/resume";

export const DEFAULT_FIELD_ORDER: BasicFieldType[] = [
  { id: "1", key: "name", label: "姓名", type: "text", visible: true },
  { id: "2", key: "title", label: "职位", type: "text", visible: true },
  { id: "3", key: "employementStatus", label: "状态", type: "text", visible: true },
  { id: "4", key: "birthDate", label: "生日", type: "date", visible: true },
  { id: "5", key: "email", label: "邮箱", type: "text", visible: true },
  { id: "6", key: "phone", label: "电话", type: "text", visible: true },
  { id: "7", key: "location", label: "所在地", type: "text", visible: true },
];

// 精选字体：界面显示中文名，value 为实际字体族（默认黑体）
export const FONT_OPTIONS = [
  { value: "'SimHei', 'Heiti SC', sans-serif", label: "黑体" },
  { value: "'Microsoft YaHei', 'PingFang SC', sans-serif", label: "微软雅黑" },
  { value: "'SimSun', 'Songti SC', serif", label: "宋体" },
  { value: "'KaiTi', 'Kaiti SC', serif", label: "楷体" },
  { value: "'FangSong', 'FangSong SC', serif", label: "仿宋" },
];

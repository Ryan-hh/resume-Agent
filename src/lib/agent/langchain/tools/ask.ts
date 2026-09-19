import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * 「询问用户」工具：Agent 在完成重要改动（如润色、批量修改）后调用它向用户发起确认，
 * 由前端渲染确认卡片。用户点「应用」时，前端会直接按 application 字段执行写入工具，
 * 不再让 AI 跑第二次；用户点「放弃」则不做任何改动。
 * 返回特殊标记 __ask_user__，前端据此弹出确认 UI。
 */
export function createAskUserTools() {
  return [
    tool(
      async ({ question, options, application, preview }) => {
        return JSON.stringify({
          __ask_user__: true,
          question,
          options: options ?? [],
          application: application ?? null,
          preview: preview ?? "",
        });
      },
      {
        name: "ask_user",
        description:
          "向用户发起一次确认/询问（例如润色或重要修改完成后，询问用户是否接受结果）。调用后立即结束当前回合，把候选内容在回复中展示给用户并说明将等待确认；不要在没有询问的情况下直接执行有争议的修改。\n" +
          "调用时必须在 application 字段中给出「用户确认后要执行的写入操作」：{ tool: 目标工具名, args: 该工具的参数对象 }。" +
          "tool 必须是本会话可用工具列表中的名字（如 update_text_content / upsert_section / replace_field / update_basic / update_global_settings 等），args 必须包含该工具要求的全部参数和完整的新内容。" +
          "例如润色技能板块：{ \"tool\": \"update_text_content\", \"args\": { \"sectionId\": \"skills\", \"content\": \"润色后的完整HTML或文本\" } }。" +
          "用户确认后系统会直接按 application 执行写入，你不需要再调用任何工具。\n" +
          "同时必须在 preview 字段中给出确认卡上要展示的候选内容：与简历中的实际格式保持一致（含加粗、列表、有序列表等 HTML 富文本或纯文本），让用户看到的就是将要写入的样子。",
        schema: z.object({
          question: z.string().describe("要询问用户的问题，例如「润色后的版本是否应用到简历？」"),
          options: z
            .array(z.string())
            .optional()
            .describe("可选按钮选项，例如 ['应用','放弃']；不传则默认显示「应用 / 放弃」"),
          application: z
            .object({
              tool: z.string().describe("用户确认后要执行的写入工具名（必须是本会话可用工具列表中的名字）"),
              args: z.record(z.string(), z.unknown()).describe("该工具的参数对象，必须包含完整的新内容"),
            })
            .optional()
            .describe("用户确认后要执行的写入操作；请务必提供"),
          preview: z
            .string()
            .optional()
            .describe("确认卡上要展示的候选内容，与简历实际格式一致（HTML 富文本，含加粗/列表/有序列表等，或纯文本）"),
        }),
      }
    ),
  ];
}

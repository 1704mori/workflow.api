// import type { NodeDefinition, NodeProcessor } from "../types.js";
// import nodemailer from "nodemailer";

// export const definition: NodeDefinition = {
//   id: "email_send",
//   name: "Send Email",
//   description: "Send an email using SMTP",
//   category: "communication",
//   version: "1.0.0",
//   icon: "mail",
//   inputs: [
//     {
//       id: "to",
//       label: "To",
//       type: "string",
//       required: true,
//       description: "Recipient email address",
//     },
//     {
//       id: "subject",
//       label: "Subject",
//       type: "string",
//       required: true,
//       description: "Email subject",
//     },
//     {
//       id: "body",
//       label: "Body",
//       type: "string",
//       required: true,
//       description: "Email body content",
//     },
//     {
//       id: "isHtml",
//       label: "Is HTML",
//       type: "boolean",
//       default: false,
//       description: "Whether body contains HTML",
//     },
//     {
//       id: "smtp",
//       label: "SMTP Config",
//       type: "json",
//       required: true,
//       description: "SMTP configuration",
//     },
//   ],
//   outputs: [
//     {
//       id: "success",
//       label: "Success",
//       type: "boolean",
//       description: "Whether email was sent successfully",
//     },
//     {
//       id: "messageId",
//       label: "Message ID",
//       type: "string",
//       description: "Email message ID if successful",
//     },
//   ],
// };

// export const processor: NodeProcessor = {
//   async process(inputs, context) {
//     const { to, subject, body, isHtml, smtp } = inputs;

//     try {
//       const transport = nodemailer.createTransport(smtp);

//       const result = await transport.sendMail({
//         to,
//         subject,
//         [isHtml ? "html" : "text"]: body,
//       });

//       context.logger.info(`Email sent successfully to ${to}`);
      
//       return {
//         success: true,
//         messageId: result.messageId,
//       };
//     } catch (error) {
//       context.logger.error("Failed to send email", error);
//       return {
//         success: false,
//         messageId: null,
//       };
//     }
//   },
// };

// export default { definition, processor };

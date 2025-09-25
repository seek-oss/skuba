/**
 * @internal
 */
export const md = {
  terminal: (code: string) =>
    `\`\`\`term\n${code.replace(/```/g, '\\`\\`\\`')}\n\`\`\``,
};

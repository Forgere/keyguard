import fs from 'fs';
import path from 'path';
import { ProvisionedKey } from './provisioner.js';

export class SkillGenerator {
  static generate(provisioned: ProvisionedKey, action: string, resource?: string): string {
    const skillName = `${provisioned.service}_${action}`.toLowerCase();
    const content = `
# Skill: ${skillName}

## Description
This skill allows the agent to perform the action "${action}" on the service "${provisioned.service}"${resource ? ` for resource "${resource}"` : ''}.
The access is restricted by KeyGuard to ensure minimum permissions.

## Capabilities
- Service: ${provisioned.service}
- Action: ${action}
- Permissions: ${provisioned.permissions.join(', ')}
${resource ? `- Target Resource: ${resource}` : ''}

## Usage
When you need to perform this action, use the following session token with the \`proxy_request\` tool:
**Session Token**: \`{{SESSION_TOKEN}}\`

## Security Note
This skill uses a restricted token managed by KeyGuard. Do not attempt to use it for actions outside the specified scope.
    `.trim();

    return content;
  }

  static saveSkill(content: string, skillName: string, outputDir: string = 'skills') {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const filePath = path.join(outputDir, `${skillName}.md`);
    fs.writeFileSync(filePath, content);
    return filePath;
  }
}

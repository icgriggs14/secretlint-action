const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');
const path = require('path');

async function run() {
  try {
    const failOnError = core.getInput('fail_on_error') !== 'false';
    const filePaths = core.getInput('paths') || '**/*';
    const configPath = core.getInput('config') || '';
    const token = core.getInput('github_token');
    const workingDir = core.getInput('working_directory') || '.';

    core.info(`secretlint-action: scanning ${filePaths} in ${workingDir} (fail_on_error=${failOnError})`);

    let output = '';
    let errOutput = '';

    const options = {
      cwd: workingDir,
      ignoreReturnCode: true,
      listeners: {
        stdout: (data) => { output += data.toString(); },
        stderr: (data) => { errOutput += data.toString(); },
      },
    };

    // Build secretlint command args
    const args = ['--yes', 'secretlint', '--format', 'json'];
    if (configPath) {
      args.push('--secretlintrc', configPath);
    }
    args.push(filePaths);

    const exitCode = await exec.exec('npx', args, options);

    let findingCount = 0;
    let findings = [];
    let parseError = null;

    // Parse JSON output from secretlint
    try {
      const jsonOutput = output.trim();
      if (jsonOutput) {
        const result = JSON.parse(jsonOutput);
        // secretlint JSON format: { results: [{ filePath, messages: [{ message, ruleId, severity }] }] }
        if (result && result.results) {
          for (const fileResult of result.results) {
            if (fileResult.messages && fileResult.messages.length > 0) {
              findingCount += fileResult.messages.length;
              for (const msg of fileResult.messages) {
                findings.push({
                  file: fileResult.filePath,
                  rule: msg.ruleId || 'unknown',
                  message: msg.message || 'Secret detected',
                  severity: msg.severity || 1,
                });
              }
            }
          }
        }
      }
    } catch (e) {
      parseError = e.message;
      // Fallback: if exit code non-zero, assume findings
      if (exitCode !== 0) {
        findingCount = 1;
        findings.push({
          file: 'unknown',
          rule: 'secretlint/unknown',
          message: `secretlint exited with code ${exitCode} — check raw output for details`,
          severity: 1,
        });
      }
      core.debug(`secretlint-action: JSON parse error: ${parseError}`);
    }

    core.setOutput('finding_count', findingCount.toString());
    const passed = findingCount === 0 && (exitCode === 0 || !failOnError);
    core.setOutput('passed', passed.toString());

    core.info(`secretlint-action: exit=${exitCode}, findings=${findingCount}, passed=${passed}`);

    // Post PR comment if running in a PR context
    if (token && github.context.payload.pull_request) {
      try {
        const octokit = github.getOctokit(token);
        const { owner, repo } = github.context.repo;
        const prNumber = github.context.payload.pull_request.number;

        const statusEmoji = passed ? '✅' : '🚨';
        const statusText = passed ? 'PASSED — no secrets detected' : 'FAILED — secrets/credentials detected';

        let body = `## ${statusEmoji} secretlint — ${statusText}\n\n`;

        if (findingCount === 0) {
          body += `No leaked API keys, tokens, or credentials detected.\n\n`;
        } else {
          body += `**${findingCount} finding(s) detected:**\n\n`;
          body += `| File | Rule | Finding |\n|------|------|----------|\n`;

          const displayFindings = findings.slice(0, 20);
          for (const f of displayFindings) {
            const safeFile = f.file.replace(/\|/g, '\\|');
            const safeMsg = f.message.substring(0, 80).replace(/\|/g, '\\|');
            body += `| \`${safeFile}\` | \`${f.rule}\` | ${safeMsg} |\n`;
          }

          if (findings.length > 20) {
            body += `\n*... and ${findings.length - 20} more findings — see full secretlint output for details.*\n`;
          }

          body += `\n> **Compliance note:** Leaked credentials violate SOC2, HIPAA, and PCI-DSS requirements.\n`;
          body += `> Rotate any exposed secrets immediately via your credential provider dashboard.\n\n`;
        }

        body += `---\n*Powered by [secretlint-action](https://github.com/icgriggs14/secretlint-action) — `;
        body += `[secretlint](https://github.com/secretlint/secretlint) CI companion (~100-300K weekly npm downloads)*\n`;
        body += `*Support this project: [GitHub Sponsors](https://github.com/sponsors/icgriggs14)*`;

        await octokit.rest.issues.createComment({ owner, repo, issue_number: prNumber, body });
        core.info('secretlint-action: PR comment posted');
      } catch (commentErr) {
        core.warning(`secretlint-action: failed to post PR comment: ${commentErr.message}`);
      }
    }

    if (!passed) {
      if (failOnError && findingCount > 0) {
        core.setFailed(
          `secretlint detected ${findingCount} credential/secret finding(s). ` +
          `Rotate exposed secrets and review secretlint output above.`
        );
      } else if (exitCode !== 0 && failOnError) {
        core.setFailed(`secretlint exited with code ${exitCode}. Review output above.`);
      }
    } else {
      core.info('secretlint-action: clean — no secrets detected');
    }
  } catch (err) {
    core.setFailed(`secretlint-action error: ${err.message}`);
  }
}

run();

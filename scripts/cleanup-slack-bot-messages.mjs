/**
 * Скрипт для очистки повідомлень бота з усіх Slack-каналів Brand Constructor.
 *
 * Запуск:
 *   node scripts/cleanup-slack-bot-messages.mjs
 *
 * Dry-run (показати, що буде видалено, без реального видалення):
 *   DRY_RUN=true node scripts/cleanup-slack-bot-messages.mjs
 *
 * Токен береться автоматично з packages/worker/.dev.vars (або з env SLACK_BOT_TOKEN).
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Конфіг каналів ──────────────────────────────────────────────────────────

const CHANNELS = [
  { id: 'C0ANN1XJSTS', name: 'bc-strategy' },
  { id: 'C0AMCBX3DEK', name: 'bc-pr' },
  { id: 'C0AMTR5FLTC', name: 'bc-design' },
  { id: 'C0AMSELFLJJ', name: 'bc-approvals' },
];

// ─── Читаємо токен ────────────────────────────────────────────────────────────

function loadToken() {
  if (process.env.SLACK_BOT_TOKEN) return process.env.SLACK_BOT_TOKEN;

  const devVarsPath = resolve(__dirname, '../packages/worker/.dev.vars');
  try {
    const content = readFileSync(devVarsPath, 'utf-8');
    const match = content.match(/SLACK_BOT_TOKEN=(.+)/);
    if (match) return match[1].trim();
  } catch {
    // файл не знайдено
  }

  console.error('❌  SLACK_BOT_TOKEN не знайдено. Передайте через env або переконайтесь, що packages/worker/.dev.vars існує.');
  process.exit(1);
}

// ─── Slack API helpers ────────────────────────────────────────────────────────

async function slackGet(token, method, params = {}) {
  const url = new URL(`https://slack.com/api/${method}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`${method} failed: ${data.error}`);
  return data;
}

async function slackDelete(token, channel, ts) {
  const res = await fetch('https://slack.com/api/chat.delete', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel, ts }),
  });
  const data = await res.json();
  return data;
}

/** Пауза для respect rate-limit (Slack Tier 3 ~50 req/min для chat.delete) */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Отримати bot_id поточного токена ────────────────────────────────────────

async function getBotUserId(token) {
  const data = await slackGet(token, 'auth.test');
  return { userId: data.user_id, botId: data.bot_id };
}

// ─── Зібрати всі повідомлення каналу (пагінація) ─────────────────────────────

async function fetchAllMessages(token, channelId) {
  const messages = [];
  let cursor;

  do {
    const params = { channel: channelId, limit: 200 };
    if (cursor) params.cursor = cursor;

    const data = await slackGet(token, 'conversations.history', params);
    messages.push(...data.messages);
    cursor = data.response_metadata?.next_cursor || null;

    if (cursor) await sleep(600); // rate-limit
  } while (cursor);

  return messages;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const DRY_RUN = process.env.DRY_RUN === 'true';
  const token = loadToken();

  console.log('🔑  Токен завантажено.');
  if (DRY_RUN) console.log('🧪  DRY_RUN=true — реального видалення НЕ буде.\n');

  let { userId, botId } = await getBotUserId(token);
  console.log(`🤖  Bot user_id: ${userId}  bot_id: ${botId || '(відсутній)'}\n`);

  let totalDeleted = 0;
  let totalErrors = 0;

  for (const channel of CHANNELS) {
    console.log(`─────────────────────────────────────────`);
    console.log(`📢  Канал: #${channel.name}  (${channel.id})`);

    let messages;
    try {
      messages = await fetchAllMessages(token, channel.id);
    } catch (err) {
      console.error(`  ⚠️  Не вдалося отримати повідомлення: ${err.message}`);
      console.error('     Можлива причина: бот не є членом каналу або відсутній scope channels:history / groups:history.');
      continue;
    }

    // Фільтруємо тільки повідомлення нашого бота
    const botMessages = messages.filter(
      (m) =>
        m.bot_id === botId ||       // відправлено цим bot_id
        m.user === userId ||        // або від цього user (для legacy bot users)
        m.subtype === 'bot_message' // або взагалі bot_message
    );

    console.log(`  📨  Всього повідомлень: ${messages.length}, повідомлень бота: ${botMessages.length}`);

    if (botMessages.length === 0) {
      console.log('  ✅  Нема що видаляти.');
      continue;
    }

    let deleted = 0;
    let errors = 0;

    for (const msg of botMessages) {
      if (DRY_RUN) {
        const preview = (msg.text || '(blocks-only)').slice(0, 60);
        console.log(`  🔍  [dry] ts=${msg.ts}  "${preview}"`);
        deleted++;
        continue;
      }

      const result = await slackDelete(token, channel.id, msg.ts);
      if (result.ok) {
        process.stdout.write('.');
        deleted++;
      } else {
        errors++;
        console.error(`\n  ❌  ts=${msg.ts}  error=${result.error}`);
      }

      await sleep(1200); // ~50 req/min, з запасом
    }

    if (!DRY_RUN) process.stdout.write('\n');
    console.log(`  ✅  Видалено: ${deleted}  Помилок: ${errors}`);

    totalDeleted += deleted;
    totalErrors += errors;
  }

  console.log('\n═════════════════════════════════════════');
  console.log(`🏁  Готово. Видалено: ${totalDeleted}  Помилок: ${totalErrors}`);
  if (DRY_RUN) console.log('    (це був dry-run, нічого реально не видалялось)');
}

main().catch((err) => {
  console.error('❌  Критична помилка:', err.message);
  process.exit(1);
});

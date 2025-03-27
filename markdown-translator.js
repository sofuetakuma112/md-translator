/**
 * Markdown Translator by Gemini
 * 
 * 英語のマークダウンファイルを日本語に翻訳するNode.jsツール
 * Google Gemini APIを使用して、マークダウン形式を維持したまま翻訳を行います
 * 
 * @license ISC
 * @version 1.0.0
 */
const fs = require("fs").promises;
const path = require("path");
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config(); // .envファイルから環境変数を読み込む

// コマンドライン引数を解析
const argv = require("yargs")
  .option("source", {
    alias: "s",
    description: "マークダウンファイルを含むソースディレクトリ",
    type: "string",
    default: "./markdown-files",
  })
  .option("output", {
    alias: "o",
    description: "翻訳ファイルの基本出力ディレクトリ",
    type: "string",
    default: "./translated-markdown-files",
  })
  .option("model", {
    alias: "m",
    description: "Gemini APIモデル名",
    type: "string",
    default: "gemini-2.0-flash",
  })
  .option("force", {
    alias: "f",
    description: "既に翻訳済みのファイルも強制的に再翻訳する",
    type: "boolean",
    default: false,
  })
  .help()
  .alias("help", "h").argv;

// 設定
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("エラー: GEMINI_API_KEY環境変数が設定されていません");
  process.exit(1);
}

const MODEL_NAME = argv.model;
const SOURCE_DIR = argv.source;
const BASE_OUTPUT_DIR = argv.output;
// モデル名からディレクトリ名を作成（無効な文字を除去）
const MODEL_DIR_NAME = MODEL_NAME.replace(/[^\w.-]/g, "_");
// 最終的な出力ディレクトリはベースディレクトリ/モデル名
const OUTPUT_DIR = path.join(BASE_OUTPUT_DIR, MODEL_DIR_NAME);
const FORCE_TRANSLATE = argv.force;

// Gemini APIの初期化
const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * 指定されたディレクトリ内のすべてのマークダウンファイルを再帰的に検索する
 * @param {string} directory - スキャンするディレクトリ
 * @returns {Promise<string[]>} - マークダウンファイルパスの配列
 */
async function findMarkdownFiles(directory) {
  try {
    const files = await fs.readdir(directory);
    const markdownFiles = [];

    for (const file of files) {
      const filePath = path.join(directory, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        // ディレクトリの場合は再帰的に検索
        const subFiles = await findMarkdownFiles(filePath);
        markdownFiles.push(...subFiles);
      } else if (file.endsWith(".md") || file.endsWith(".markdown")) {
        markdownFiles.push(filePath);
      }
    }

    return markdownFiles;
  } catch (error) {
    console.error(`ディレクトリ ${directory} の読み取りエラー:`, error.message);
    return [];
  }
}

/**
 * マークダウンファイルからコンテンツを読み取る
 * @param {string} filePath - マークダウンファイルへのパス
 * @returns {Promise<string>} - ファイルコンテンツ
 */
async function readMarkdownFile(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    console.error(`ファイル ${filePath} の読み取りエラー:`, error.message);
    return "";
  }
}

/**
 * ファイルが既に翻訳済みかどうかをチェックする
 * @param {string} filePath - チェックするファイルのパス
 * @returns {Promise<boolean>} - 翻訳済みかどうか
 */
async function isAlreadyTranslated(filePath) {
  const fileName = path.basename(filePath);
  const outputPath = path.join(OUTPUT_DIR, fileName);

  try {
    // 出力ファイルの存在と最終更新日時を確認
    const outputStat = await fs.stat(outputPath);
    const sourceStat = await fs.stat(filePath);

    // 出力ファイルが存在し、ソースファイルより新しい場合は翻訳済みと判断
    return outputStat.isFile() && outputStat.mtime >= sourceStat.mtime;
  } catch (error) {
    // ファイルが存在しない場合など
    return false;
  }
}

/**
 * Gemini APIを使用してテキストを日本語に翻訳する
 * @param {string} text - 翻訳するテキスト
 * @returns {Promise<string>} - 翻訳されたテキスト
 */
async function translateToJapanese(text) {
  try {
    const prompt = `以下のマークダウンテキストを英語から日本語に翻訳してください。
マークダウンの書式、コードブロック、特殊文字はすべて保持してください。
翻訳結果は、余分な説明やコードブロックの記号（\`\`\`）を含めずに、翻訳されたマークダウン本文のみを出力してください。

${text}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    // 翻訳結果からコードブロック内のコンテンツを抽出
    return response.text
  } catch (error) {
    console.error("翻訳エラー:", error.message);
    return ""; // エラー時は空の文字列を返す
  }
}

/**
 * 翻訳したコンテンツをファイルに保存する
 * @param {string} filePath - 元のファイルパス
 * @param {string} content - 翻訳されたコンテンツ
 */
async function saveTranslatedFile(filePath, content) {
  try {
    // 出力ディレクトリが存在しない場合は作成する
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // ソースディレクトリからの相対パスを取得
    const relativePath = path.relative(SOURCE_DIR, filePath);
    const outputPath = path.join(OUTPUT_DIR, relativePath);

    // 出力ファイルのディレクトリを作成
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    await fs.writeFile(outputPath, content, "utf8");
    console.log(`✓ 翻訳して保存しました: ${outputPath}`);
  } catch (error) {
    console.error(`ファイル ${filePath} の保存エラー:`, error.message);
  }
}

/**
 * レート制限を回避するために遅延を付けて翻訳バッチを処理する
 * @param {Array} files - ファイルパスの配列
 */
async function processBatchWithDelay(files) {
  let translatedCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    try {
      console.log(`処理中: ${file}`);

      // 強制翻訳が指定されていない場合は、既に翻訳済みのファイルをスキップ
      if (!FORCE_TRANSLATE && (await isAlreadyTranslated(file))) {
        console.log(`✓ スキップしました（既に翻訳済み）: ${file}`);
        skippedCount++;
        continue;
      }

      const content = await readMarkdownFile(file);
      if (!content) continue;

      const translated = await translateToJapanese(content);
      if (translated) {
        await saveTranslatedFile(file, translated);
        translatedCount++;
      }

      // レート制限に到達しないように、リクエスト間に遅延を追加
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`ファイル ${file} の処理エラー:`, error.message);
    }
  }

  return { translatedCount, skippedCount };
}

/**
 * すべてのマークダウンファイルを翻訳するメイン関数
 */
async function translateMarkdownFiles() {
  try {
    console.log(`${SOURCE_DIR} 内のマークダウンファイルを検索中...`);
    const markdownFiles = await findMarkdownFiles(SOURCE_DIR);

    if (markdownFiles.length === 0) {
      console.log("マークダウンファイルが見つかりませんでした。");
      return;
    }

    console.log(
      `${markdownFiles.length} 個のマークダウンファイルが見つかりました。`
    );
    console.log(`使用モデル: ${MODEL_NAME}`);
    console.log(`出力ディレクトリ: ${OUTPUT_DIR}`);

    if (FORCE_TRANSLATE) {
      console.log(
        "注意: 強制翻訳モード（--force）が有効です。既存の翻訳ファイルも上書きします。"
      );
    }

    const { translatedCount, skippedCount } = await processBatchWithDelay(
      markdownFiles
    );

    console.log("\n翻訳処理の概要:");
    console.log(`- 合計ファイル数: ${markdownFiles.length}`);
    console.log(`- 翻訳したファイル: ${translatedCount}`);
    console.log(`- スキップしたファイル: ${skippedCount}`);
    console.log("翻訳完了！");
  } catch (error) {
    console.error("翻訳プロセスのエラー:", error.message);
  }
}

// ソースディレクトリが存在するか確認してから処理を開始
async function checkSourceDirectory() {
  try {
    await fs.access(SOURCE_DIR);
    // メイン関数を実行
    await translateMarkdownFiles();
  } catch (error) {
    console.error(
      `エラー: ソースディレクトリ '${SOURCE_DIR}' が存在しないかアクセスできません。`
    );
    console.log(
      `ディレクトリを作成するか、--sourceオプションで別のディレクトリを指定してください。`
    );
    process.exit(1);
  }
}

// メインの処理を実行する関数
async function main() {
  await checkSourceDirectory();
}

// 処理を開始
main().catch((error) => {
  console.error("アプリケーションエラー:", error.message);
  process.exit(1);
});

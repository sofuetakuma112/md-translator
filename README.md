# Markdown Translator by Gemini

英語のマークダウンファイルを日本語に翻訳するシンプルな Node.js ツールです。Google Gemini API を使用して、マークダウン形式を維持したまま翻訳を行います。

## 機能

- 複数のマークダウンファイルを一括処理
- ディレクトリ構造を保持した翻訳ファイルの出力
- コードブロックや特殊文字を含むマークダウン形式の保持
- 再翻訳の制御（既に翻訳済みのファイルはスキップ）

## インストール方法

1. リポジトリをクローンします：

   ```bash
   git clone https://github.com/yourusername/md-translater-by-gemini.git
   cd md-translater-by-gemini
   ```

2. 必要な依存パッケージをインストールします：

   ```bash
   npm install
   ```

3. `.env`ファイルを作成し、Google Gemini API キーを設定します：
   ```
   GEMINI_API_KEY=あなたのAPIキー
   ```

## 使用方法

1. 英語のマークダウンファイルを`markdown-files`ディレクトリ（または指定したソースディレクトリ）に配置します。

2. デフォルト設定でスクリプトを実行します：

   ```bash
   node markdown-translator.js
   ```

   または、npm スクリプトを使用：

   ```bash
   npm run translate
   ```

3. またはコマンドライン引数で実行します：

   ```bash
   node markdown-translator.js --source ./my-docs --output ./ja-docs --model gemini-2.5-pro
   ```

4. 既存の翻訳を強制的に上書きするには：

   ```bash
   npm run translate:force
   ```

5. 翻訳された日本語のマークダウンファイルは出力ディレクトリに保存されます。

## コマンドラインオプション

スクリプトは以下のコマンドライン引数をサポートしています：

```
オプション:
  --source, -s  マークダウンファイルを含むソースディレクトリ
                                          [string] [デフォルト: "./markdown-files"]
  --output, -o  翻訳ファイルの出力先ディレクトリ
                                [string] [デフォルト: "./translated-markdown-files"]
  --model, -m   Gemini APIモデル名     [string] [デフォルト: "gemini-2.0-flash"]
  --force, -f   既に翻訳済みのファイルも強制的に再翻訳する
                                                  [boolean] [デフォルト: false]
  --help, -h    ヘルプ情報を表示                                      [boolean]
```

## 環境変数

`.env`ファイルに以下の変数を設定します：

- `GEMINI_API_KEY`: Google Gemini API キー（必須）

## 出力ディレクトリ構造

翻訳されたファイルは次の構造で保存されます：

```
出力ディレクトリ
└── 使用モデル名
    └── ソースと同じディレクトリ構造
        └── 翻訳されたファイル
```

## トラブルシューティング

レート制限に問題がある場合：

- スクリプト内の`setTimeout`の値を変更して、API 呼び出し間の遅延を増やす
- 一度に処理するファイル数を減らす

翻訳が不完全な場合：

- 大きなファイルは小さなチャンクに分割する必要があるかもしれません
- 非常に大きなファイルの場合はバッチ処理の実装を検討してください

## ライセンス

ISC

## 作者

sofuetakuma

# Soramame
模試受付・座席案内システム

## 機能
予備校の模擬試験会場受付に使用できるアプリケーションです。
受験番号・氏名・受験教室・座席番号を事前に登録しておくと、受験番号に対応したQRコードから情報を表示できます。

## QRコードについて
受験票に載せるQRコードは```xxxxxxxx,,,,,yyy```のようなものとしてください。
```,```以前の部分```x```を受験番号として取り出すため、```,```以降の```y```の部分には任意の情報(会場コードetc.)を乗せることができます。

## 使い方
sample.csvのデータを書き換え、
ローカルホストでindex.htmlを開けば使えます。
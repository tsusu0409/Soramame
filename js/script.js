// Webカメラの起動
const video = document.getElementById('video');
let contentWidth;
let contentHeight;

const media = navigator.mediaDevices.getUserMedia({ audio: false, video: {width:480, height:480} })
   .then((stream) => {
      video.srcObject = stream;
      video.onloadeddata = () => {
         console.log("カメラが起動しました！");
         video.play();
         contentWidth = video.clientWidth;
         contentHeight = video.clientHeight;
         canvasUpdate();
         checkImage();
      }
   }).catch((e) => {
      console.log("[error]カメラの起動に失敗しました", e);
   });

// カメラ映像のキャンバス表示
const cvs = document.getElementById('camera-canvas');
const ctx = cvs.getContext('2d');
const canvasUpdate = () => {
   cvs.width = contentWidth;
   cvs.height = contentHeight;
   ctx.drawImage(video, 0, 0, contentWidth, contentHeight);
   requestAnimationFrame(canvasUpdate);
}

document.getElementById('csvFileInput').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (event) {
    const text = event.target.result;
    const csvData = parseCSV(text);
    localStorage.setItem('csvData', JSON.stringify(csvData));
    console.log('保存されたデータ:', csvData);
  };

  reader.readAsText(file);
});

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
  const headers = lines[0].split(",");
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",");
    if (cells.length === headers.length) {
      data.push(cells);
    }
  }

  return data;
}

function getCSVFromLocalStorage() {
  const data = localStorage.getItem('csvData');
  return data ? JSON.parse(data) : [];
}



// CSVファイルを相対パスで読み込む
const rawData = csv2Array('../data/sample.csv');
const data = rawData.map(row => ({
   number: row[0].trim(), // 念のためtrim
   name: row[1].trim(),
   room: row[2].trim(),
   sheet: row[3].trim()
}));




// CSVファイルの読み込み状況に応じてテキストを書き換える
if(data) {
   document.getElementById("data-msg").innerText = `座席データを読み込みました。`;
}

// qrDataに合致する生徒情報を検索
const searchStudent = (data, qrData) => {
   for(let i=0; i<data.length; i++) {
      if(data[i].number === qrData) {
         return data[i];
      }
   }
   return null;
}

// QRコードの検出
let qrData = null;
let qrLocked = false;
const rectCvs = document.getElementById('rect-canvas');
const rectCtx =  rectCvs.getContext('2d');
const checkImage = () => {
   if (!qrLocked) {
      const imageData = ctx.getImageData(0, 0, contentWidth, contentHeight);
      const code = jsQR(imageData.data, contentWidth, contentHeight);

      if (code) {
         qrData = code.data.trim(); // ← 必ずtrim
         qrLocked = true;
         console.log("QRcodeが見つかりました", qrData);
         showResult(qrData);
         saveToLocalStorage(qrData);
         drawRect(code.location);
         document.getElementById('qr-msg').textContent = `QRコード：${qrData}`;
      } else {
         console.log("QRcodeが見つかりません…", code);
         rectCtx.clearRect(0, 0, contentWidth, contentHeight);
      }
   }

   // 🔁 この位置でループを継続させる
   requestAnimationFrame(checkImage);
}


// 四辺形の描画
const drawRect = (location) => {
   rectCvs.width = contentWidth;
   rectCvs.height = contentHeight;
   drawLine(location.topLeftCorner, location.topRightCorner);
   drawLine(location.topRightCorner, location.bottomRightCorner);
   drawLine(location.bottomRightCorner, location.bottomLeftCorner);
   drawLine(location.bottomLeftCorner, location.topLeftCorner)
}

// 線の描画
const drawLine = (begin, end) => {
   rectCtx.lineWidth = 4;
   rectCtx.strokeStyle = "#F00";
   rectCtx.beginPath();
   rectCtx.moveTo(begin.x, begin.y);
   rectCtx.lineTo(end.x, end.y);
   rectCtx.stroke();
}

// 結果の表示
const showResult = (qrData) => {
   document.getElementById('data-msg').textContent = `座席データ：読み込み済み`;
   if (qrData) {
      const result = searchStudent(data, qrData);
      if (result) {
         document.getElementById("result-number").innerText = `生徒番号：${result.number}`;
         document.getElementById("result-name").innerText = `氏名：${result.name}`;
         document.getElementById("result-room").innerText = `試験教室：${result.room}`;
         document.getElementById("result-sheet").innerText = `座席番号：${result.sheet}`;
      } else {
         document.getElementById("result-number").innerText = `生徒番号：該当する生徒情報が見つかりませんでした。`;
         document.getElementById("result-name").innerText = ``;
         document.getElementById("result-room").innerText = ``;
         document.getElementById("result-sheet").innerText = ``;
      }
   }
}


// canvasのクリア
function clearCanvas() {
   const canvasElement = document.getElementById("rect-canvas");
   const canvas = canvasElement.getContext("2d");
   canvas.clearRect(0, 0, canvasElement.width, canvasElement.height);
}
 

//quLockを解除するボタン
document.getElementById("next-btn").addEventListener("click", () => {
   // QR読み取りロックを解除
   qrLocked = false;

   clearCanvas(); // canvasのクリア

   // 結果の表示をクリア
   document.getElementById('qr-msg').textContent = "QRコード: 見つかりません";
   document.getElementById("result-number").innerText = "生徒番号：";
   document.getElementById("result-name").innerText = "氏名：";
   document.getElementById("result-room").innerText = "試験教室：";
   document.getElementById("result-sheet").innerText = "座席番号：";
 
   console.log("QR読み取りロック解除！");
 });
 

// 生徒番号の保存
function exportCSV() {
   let records = JSON.parse(localStorage.getItem('acceptedStudents'));
   console.log("エクスポート対象データ:", records);

   if (!records || records.length === 0) {
      alert("保存された生徒番号がありません。");
      return;
   }

   let csv = "number\n";
   csv += records.map(n => `${n}`).join("\n");

   const blob = new Blob([csv], { type: "text/csv" });
   const url = URL.createObjectURL(blob);

   const a = document.createElement("a");
   a.href = url;
   a.download = "accepted.csv";
   a.click();
   URL.revokeObjectURL(url);
}

// 生徒番号の一時保存
function saveToLocalStorage(qrData) {
   let records = JSON.parse(localStorage.getItem('acceptedStudents')) || [];
   if (!records.includes(qrData)) { // 重複防止（任意）
      records.push(qrData);
      localStorage.setItem('acceptedStudents', JSON.stringify(records));
   }
}

function clearAcceptedStudents() {
   if (confirm("保存された生徒データを本当に削除しますか？")) {
      localStorage.removeItem('acceptedStudents');
      alert("削除しました！");
   }
   localStorage.removeItem('acceptedStudents');
   console.log("ローカルストレージを削除しました。");
}

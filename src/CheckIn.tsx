import React, { useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr'; // 値のインポート
import type { QRCode } from 'jsqr'; // 型のインポート
import './CheckIn.css'; // 作成したCSSファイルをインポート

// --- 型定義 ---
interface StudentData {
  number: string;
  name: string;
  room: string;
  sheet: string;
}

// --- 不足している関数の仮定義 ---
function csv2Array(csvText: string): string[][] {
  return csvText
    .split(/\r?\n/)
    .filter(line => line.trim() !== "")
    .map(line => line.split(",").map(cell => cell.trim()));
}


const CheckIn: React.FC = () => {
  // DOM要素への参照
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement>(null);
  const rectCanvasRef = useRef<HTMLCanvasElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // メッセージ表示用DOM要素への参照
  const dataMsgRef = useRef<HTMLParagraphElement>(null);
  const qrMsgRef = useRef<HTMLParagraphElement>(null);
  const resultNumberRef = useRef<HTMLParagraphElement>(null);
  const resultNameRef = useRef<HTMLParagraphElement>(null);
  const resultRoomRef = useRef<HTMLParagraphElement>(null);
  const resultSheetRef = useRef<HTMLParagraphElement>(null);

  // 値を保持するためのuseRef
  const contentWidth = useRef<number>(0);
  const contentHeight = useRef<number>(0);
  const qrLocked = useRef<boolean>(false);
  const studentData = useRef<StudentData[]>([]);
  const animationFrameId = useRef<number | null>(null);

  // --- 関数の定義 (useCallbackでメモ化) ---

  const searchStudent = useCallback((data: StudentData[], qrData: string): StudentData | null => {
    return data.find(student => student.number === qrData) || null;
  }, []);

  const showResult = useCallback((qrData: string) => {
    if (dataMsgRef.current) {
        dataMsgRef.current.textContent = `座席データ：読み込み済み`;
    }
    const result = searchStudent(studentData.current, qrData);
    if (resultNumberRef.current && resultNameRef.current && resultRoomRef.current && resultSheetRef.current) {
        if (result) {
            resultNumberRef.current.innerText = `生徒番号：${result.number}`;
            resultNameRef.current.innerText = `氏名：${result.name}`;
            resultRoomRef.current.innerText = `試験教室：${result.room}`;
            resultSheetRef.current.innerText = `座席番号：${result.sheet}`;
        } else {
            resultNumberRef.current.innerText = `生徒番号：該当する生徒情報が見つかりませんでした。`;
            resultNameRef.current.innerText = ``;
            resultRoomRef.current.innerText = ``;
            resultSheetRef.current.innerText = ``;
        }
    }
  }, [searchStudent]);

  const drawRect = useCallback((location: QRCode['location']) => {
    const canvas = rectCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = contentWidth.current;
    canvas.height = contentHeight.current;
    const drawLine = (begin: { x: number; y: number }, end: { x: number; y: number }) => {
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#F00";
      ctx.beginPath();
      ctx.moveTo(begin.x, begin.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    };
    drawLine(location.topLeftCorner, location.topRightCorner);
    drawLine(location.topRightCorner, location.bottomRightCorner);
    drawLine(location.bottomRightCorner, location.bottomLeftCorner);
    drawLine(location.bottomLeftCorner, location.topLeftCorner);
  }, []);
  
  const saveToLocalStorage = (qrData: string) => {
    let records: string[] = JSON.parse(localStorage.getItem('acceptedStudents') || '[]');
    if (!records.includes(qrData)) {
      records.push(qrData);
      localStorage.setItem('acceptedStudents', JSON.stringify(records));
    }
  };

  // --- 副作用の管理 (useEffect) ---
  useEffect(() => {
    const video = videoRef.current;
    const cameraCvs = cameraCanvasRef.current;
    const cameraCtx = cameraCvs?.getContext('2d');
    const rectCvs = rectCanvasRef.current;
    const rectCtx = rectCvs?.getContext('2d');
    const csvFileInput = csvFileInputRef.current;
    let stream: MediaStream | null = null;
    
    // ====================================================================
    // 変更点：映像描画とQRコード検出を1つのループに統合
    // ====================================================================
    const animationLoop = () => {
      if (!video || !cameraCtx || video.readyState !== video.HAVE_ENOUGH_DATA) {
        // ビデオの準備ができていなければ、次のフレームで再試行
        animationFrameId.current = requestAnimationFrame(animationLoop);
        return;
      }

      // 1. canvasにビデオフレームを描画 (映像表示)
      cameraCvs!.width = contentWidth.current;
      cameraCvs!.height = contentHeight.current;
      cameraCtx.drawImage(video, 0, 0, contentWidth.current, contentHeight.current);
      
      // 2. QRコードをスキャン
      if (!qrLocked.current) {
        const imageData = cameraCtx.getImageData(0, 0, contentWidth.current, contentHeight.current);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          const qrData = code.data.trim();
          qrLocked.current = true;
          console.log("QRcodeが見つかりました", qrData);
          
          showResult(qrData);
          saveToLocalStorage(qrData);
          drawRect(code.location);

          if (qrMsgRef.current) {
              qrMsgRef.current.textContent = `QRコード：${qrData}`;
          }
        } else {
            rectCtx?.clearRect(0, 0, rectCvs!.width, rectCvs!.height);
        }
      }
      
      // 3. 次のフレームを要求
      animationFrameId.current = requestAnimationFrame(animationLoop);
    };

    const handleFileChange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const parsedData = csv2Array(text);
            const data = parsedData.slice(1).map(row => ({
                number: row[0], name: row[1], room: row[2], sheet: row[3]
            }));
            studentData.current = data;
            localStorage.setItem('csvData', JSON.stringify(data));
            console.log('保存されたデータ:', data);
            if (dataMsgRef.current) {
                dataMsgRef.current.innerText = `座席データを読み込みました。`;
            }
        };
        reader.readAsText(file);
    };

    const startCamera = async () => {
        if (!video) return;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { width: 480, height: 480 } });
            video.srcObject = stream;
            // イベントを onloadedmetadata に変更
            video.onloadedmetadata = () => {
                video.play();
                // clientWidth/Height の代わりに videoWidth/Height を使用
                contentWidth.current = video.videoWidth;
                contentHeight.current = video.videoHeight;
                
                // ループ開始前に canvas のサイズを設定しておく
                if (cameraCanvasRef.current) {
                    cameraCanvasRef.current.width = contentWidth.current;
                    cameraCanvasRef.current.height = contentHeight.current;
                }
                if (rectCanvasRef.current) {
                    rectCanvasRef.current.width = contentWidth.current;
                    rectCanvasRef.current.height = contentHeight.current;
                }

                animationLoop();
            };
        } catch (e) { console.error("[error]カメラの起動に失敗しました", e); }
    };

    startCamera();
    csvFileInput?.addEventListener('change', handleFileChange);

    // クリーンアップ関数
    return () => {
        console.log("Cleanup function running...");
        // カメラの停止
        stream?.getTracks().forEach(track => track.stop());
        // イベントリスナーの削除
        csvFileInput?.removeEventListener('change', handleFileChange);
        // アニメーションフレームのキャンセル
        if(animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            console.log("Animation frame cancelled.");
        }
    };
  }, []);


  // --- イベントハンドラ ---
  const handleNextClick = () => {
    qrLocked.current = false;
    const rectCanvas = rectCanvasRef.current;
    const rectCtx = rectCanvas?.getContext('2d');
    if(rectCanvas && rectCtx) {
        rectCtx.clearRect(0, 0, rectCanvas.width, rectCanvas.height);
    }
    if (qrMsgRef.current) qrMsgRef.current.textContent = "QRコード: 見つかりません";
    if (resultNumberRef.current) resultNumberRef.current.innerText = "生徒番号：";
    if (resultNameRef.current) resultNameRef.current.innerText = "氏名：";
    if (resultRoomRef.current) resultRoomRef.current.innerText = "試験教室：";
    if (resultSheetRef.current) resultSheetRef.current.innerText = "座席番号：";
    console.log("QR読み取りロック解除！");
  };

  const exportCSV = () => {
    const records = JSON.parse(localStorage.getItem('acceptedStudents') || '[]');
    if (!records || records.length === 0) {
        alert("保存された生徒番号がありません。");
        return;
    }
    let csv = "number\n" + records.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "accepted.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const clearAcceptedStudents = () => {
    if (window.confirm("保存された生徒データを本当に削除しますか？")) {
        localStorage.removeItem('acceptedStudents');
        alert("削除しました！");
    }
  };

  return (
    <div>
      <div className="checkin-container">
          <h1>Soramame - 模試受付システム</h1>

          <div className="main-content">
          {/* --- 上段エリア（カメラとスキャン結果） --- */}
          <div className="top-row">
              <div className="camera-container">
              <video
                  ref={videoRef}
                  id="video"
                  autoPlay
                  playsInline
                  muted
                  style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '1px',
                  height: '1px',
                  opacity: 0,
                  zIndex: -1,
                  }}
              ></video>
              <canvas ref={cameraCanvasRef} id="camera-canvas"></canvas>
              <canvas ref={rectCanvasRef} id="rect-canvas"></canvas>
              </div>

              <div className="card card-result">
              <h2>スキャン結果</h2>
              <p ref={qrMsgRef} id="qr-msg">QRコード: 見つかりません</p>
              <div id="result">
                  <p ref={resultNumberRef} id="result-number">生徒番号：</p>
                  <p ref={resultNameRef} id="result-name">氏名：</p>
                  <p ref={resultRoomRef} id="result-room">試験教室：</p>
                  <p ref={resultSheetRef} id="result-sheet">座席番号：</p>
              </div>
              <button id="next-btn" onClick={handleNextClick}>次の生徒をスキャン</button>
              </div>
          </div>


          {/* --- ▼ 下段エリア（設定）▼ --- */}
          <div className="setting-section">
              <h2>設定</h2>
              <div className="bottom-row">
              <div className="card">
                  <h2>データ読み込み</h2>
                  <input type="file" ref={csvFileInputRef} id="csvFileInput" accept=".csv" />
                  <p ref={dataMsgRef} id="data-msg">座席データを読み込んでください。</p>
              </div>

              <div className="card">
                  <h2>データ管理</h2>
                  <div className="data-management-buttons">
                  <button id="export-btn" onClick={exportCSV}>データをCSVで保存</button>
                  <button id="clear-btn" onClick={clearAcceptedStudents}>データをクリア</button>
                  </div>
              </div>
              </div>
          </div>
          {/* --- ▲ 下段エリア（設定）▲ --- */}
          </div>
      </div>
    </div>
    );
};

export default CheckIn;
# 🎯 AI 프로필 사진 분석기

AI를 활용한 프로필 사진 분석 및 평가 서비스입니다.

## 🚀 배포 및 설정

### 1. Netlify 환경 변수 설정

Netlify 대시보드에서 다음 환경 변수를 설정해주세요:

- `GEMINI_API_KEY`: Google Gemini API 키
- `APPS_SCRIPT_URL`: Google Apps Script 웹앱 URL (`.../exec`)

### 2. Google Apps Script 설정 (데이터 수집용)

#### 2-1. Google 스프레드시트 생성

1. [Google 스프레드시트](https://sheets.google.com)에서 새 시트 생성
2. 시트 이름을 "Sheet1"로 유지 (또는 코드에서 수정)
3. 첫 번째 행에 헤더 추가: `요청ID`, `타임스탬프`, `이름`, `연락처`, `이미지 URL`, `동의`, `clientId`, `visitorId`, `ip`, `ua`, `lang`, `referrer`, `상태`, `인물`, `배경`, `감성`, `인물 코멘트`, `배경 코멘트`, `감성 코멘트`, `최종 한줄평`, `업데이트시각`

#### 2-2. Google Drive 폴더 생성

1. [Google Drive](https://drive.google.com)에서 이미지 저장용 폴더 생성
2. 폴더를 우클릭 → "링크 가져오기" 클릭
3. URL에서 폴더 ID 복사 (예: `https://drive.google.com/drive/folders/1ABC123xyz` → `1ABC123xyz`)

#### 2-3. Google Apps Script 설정

1. 스프레드시트에서 `확장 프로그램` → `Apps Script` 클릭
2. 기본 코드를 삭제하고 아래 코드를 붙여넣기:

```javascript
// 1. >>>>>>> 이 부분에 구글 드라이브 폴더 ID를 붙여넣어 주세요! <<<<<<<
const FOLDER_ID = "여기에_복사한_폴더_ID를_붙여넣으세요";

/**
 * 웹 앱에서 POST 요청을 받아 처리하는 메인 함수입니다.
 * 세 가지 액션을 처리합니다:
 *  - action=create: 개인정보/이미지만 저장 (기존 방식)
 *  - action=update: 분석 결과만 업데이트 (기존 방식)
 *  - action=complete: 개인정보 + 분석결과를 한 번에 저장 (최적화된 방식)
 */
function doPost(e) {
  try {
    // 디버깅을 위한 로그
    console.log("Received request:", JSON.stringify(e, null, 2));
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
    if (!sheet) {
      throw new Error("Sheet named 'Sheet1' not found. Please check the sheet name.");
    }

    // 요청 파라미터 (JSON 우선, 실패 시 폴백)
    let p;
    try {
      const postData = e.postData && e.postData.contents;
      if (postData) {
        p = JSON.parse(postData);
      } else {
        p = e.parameter || {};
      }
    } catch (parseError) {
      console.error("JSON parsing failed:", parseError);
      p = e.parameter || {};
    }
    
    console.log("Parsed parameters:", JSON.stringify(p, null, 2));
    
    const action = p.action || "create";
    const name = p.name;
    const contact = p.contact;
    const timestamp = p.timestamp;
    const imageBase64 = p.image; // Netlify에서 'image' 키로 전송
    const consent = p.consent || "N";

    // 필수 파라미터 검증
    if (action === "complete" || action === "create") {
      if (!name || !contact || !imageBase64) {
        throw new Error(`Missing required fields: name=${!!name}, contact=${!!contact}, image=${!!imageBase64}`);
      }
    }

    // AI 분석 점수/코멘트
    const figureScore = p.figureScore || "";
    const backgroundScore = p.backgroundScore || "";
    const vibeScore = p.vibeScore || "";
    const figureCritique = p.figureCritique || "";
    const backgroundCritique = p.backgroundCritique || "";
    const vibeCritique = p.vibeCritique || "";
    const finalCritique = p.finalCritique || "";

    // 🆕 complete: 개인정보 + 분석결과를 한 번에 저장 (최적화된 방식)
    if (action === "complete") {
      try {
        // 이미지 데이터 확인 및 처리
        let imageData;
        if (imageBase64.includes(',')) {
          imageData = imageBase64.split(",")[1];
        } else {
          imageData = imageBase64;
        }
        
        if (!imageData) {
          throw new Error("Invalid image data format");
        }

        // 이미지를 구글 드라이브에 저장
        const decodedImage = Utilities.base64Decode(imageData);
        const safeTimestamp = (timestamp || new Date().toLocaleString("ko-KR")).replace(/[:/\s]/g, "_");
        const imageBlob = Utilities.newBlob(
          decodedImage,
          "image/jpeg",
          `${name}_${safeTimestamp}.jpg`
        );
        const imageFolder = DriveApp.getFolderById(FOLDER_ID);
        const imageFile = imageFolder.createFile(imageBlob);
        const imageUrl = imageFile.getUrl();

        // 시트 헤더 가져오기
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        console.log("Sheet headers:", JSON.stringify(headers));

        // 모든 데이터를 한 번에 저장
        const rowMap = {
          "요청ID": p.requestId || "",
          "타임스탬프": timestamp || new Date().toLocaleString("ko-KR"),
          "이름": name || "",
          "연락처": contact || "",
          "이미지 URL": imageUrl || "",
          "최종 한줄평": finalCritique || "",
          "인물": figureScore || "",
          "배경": backgroundScore || "",
          "감성": vibeScore || "",
          "인물 코멘트": figureCritique || "",
          "배경 코멘트": backgroundCritique || "",
          "감성 코멘트": vibeCritique || "",
          "visitorId": p.visitorId || "",
          "clientId": p.clientId || "",
          "ip": p.ip || "",
          "ua": p.ua || "",
          "lang": p.lang || "",
          "referrer": p.referrer || "",
          "동의": consent || "N",
          "상태": figureScore ? "DONE" : "PENDING", // 분석결과가 있으면 DONE
          "업데이트시각": new Date().toLocaleString("ko-KR"),
        };

        console.log("Row data to insert:", JSON.stringify(rowMap, null, 2));

        const row = headers.map((h) => rowMap[h] ?? "");
        sheet.appendRow(row);

        return ContentService.createTextOutput(
          JSON.stringify({
            ok: true,
            requestId: p.requestId,
            fileUrl: imageUrl,
            action: "complete",
          })
        ).setMimeType(ContentService.MimeType.JSON);
      } catch (imageError) {
        console.error("Image processing error:", imageError);
        throw new Error("Image processing failed: " + imageError.message);
      }
    }

    // create: 개인정보만 먼저 기록 (기존 방식 유지)
    if (action === "create") {
      // ... 기존 create 로직 유지 ...
      const decodedImage = Utilities.base64Decode(imageBase64.split(",")[1]);
      const imageBlob = Utilities.newBlob(
        decodedImage,
        "image/jpeg",
        `${name}_${timestamp}.jpg`
      );
      const imageFolder = DriveApp.getFolderById(FOLDER_ID);
      const imageFile = imageFolder.createFile(imageBlob);
      const imageUrl = imageFile.getUrl();

      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const rowMap = {
        "요청ID": p.requestId,
        "타임스탬프": timestamp,
        "이름": name,
        "연락처": contact,
        "이미지 URL": imageUrl,
        "clientId": p.clientId,
        "visitorId": p.visitorId,
        "ip": p.ip,
        "ua": p.ua,
        "lang": p.lang,
        "referrer": p.referrer,
        "상태": "PENDING",
        "동의": consent,
        "업데이트시각": new Date().toLocaleString("ko-KR"),
      };
      const row = headers.map((h) => rowMap[h] ?? "");
      sheet.appendRow(row);

      return ContentService.createTextOutput(
        JSON.stringify({ ok: true, requestId: p.requestId, fileUrl: imageUrl })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // update: 동일 요청ID 행 업데이트 (기존 방식 유지)
    if (action === "update") {
      // ... 기존 update 로직 유지 ...
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const idCol = headers.indexOf("요청ID") + 1;
      if (idCol < 1) throw new Error("요청ID 헤더를 찾을 수 없습니다.");

      const lastRow = sheet.getLastRow();
      const ids = sheet.getRange(2, idCol, Math.max(lastRow - 1, 0), 1).getValues().flat();
      const idx = ids.indexOf(p.requestId);
      if (idx < 0) throw new Error("요청ID에 해당하는 행이 없습니다.");
      const row = idx + 2;

      const setCell = (header, value) => {
        const c = headers.indexOf(header) + 1;
        if (c > 0) sheet.getRange(row, c).setValue(value);
      };

      setCell("인물", figureScore);
      setCell("배경", backgroundScore);
      setCell("감성", vibeScore);
      setCell("인물 코멘트", figureCritique);
      setCell("배경 코멘트", backgroundCritique);
      setCell("감성 코멘트", vibeCritique);
      setCell("최종 한줄평", finalCritique);
      setCell("상태", "DONE");
      setCell("업데이트시각", new Date().toLocaleString("ko-KR"));

      return ContentService.createTextOutput(
        JSON.stringify({ ok: true })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("Apps Script Error:", error);
    const errorResponse = {
      result: "error",
      message: error.message,
      stack: error.stack
    };
    console.error("Error response:", JSON.stringify(errorResponse, null, 2));
    return ContentService.createTextOutput(
      JSON.stringify(errorResponse)
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 이 스크립트가 구글 드라이브에 접근할 수 있도록 권한을 강제로 요청하는 테스트 함수입니다.
 * 설정 과정에서 딱 한 번만 실행하고, 권한 허용 후에는 삭제해도 됩니다.
 */
function forceDrivePermission() {
  try {
    DriveApp.getFolderById(FOLDER_ID);
    Logger.log("Google Drive permission is already granted.");
  } catch (e) {
    Logger.log(
      "Requesting Google Drive permission. Please follow the prompts. Error: " +
        e.message
    );
  }
}
```

#### 2-4. 권한 설정 및 배포

1. `forceDrivePermission` 함수를 한 번 실행하여 Drive 권한 허용
2. `배포` → `새 배포` 클릭
3. 유형: `웹 앱` 선택
4. 실행 계정: `나` 선택
5. 액세스 권한: `모든 사용자` 선택
6. 배포 후 생성된 웹 앱 URL을 복사

#### 2-5. Netlify에 Apps Script URL 등록

1. Netlify Dashboard → Site settings → Environment variables
2. `APPS_SCRIPT_URL` 변수로 위에서 복사한 웹앱 URL(`.../exec`) 등록
3. 배포 후 서버 함수가 JSON으로 Apps Script에 기록을 전송합니다 (프론트에서 직접 호출하지 않음)

## 📁 프로젝트 구조

```
AI-faceshot-analyzer/
├── index.html                 # 메인 웹 페이지
├── netlify/
│   └── functions/
│       └── analyzeImage.js    # Gemini API 호출 함수
├── netlify.toml              # Netlify 설정 파일
└── README.md                 # 이 파일
```

## 🔧 주요 기능

- 📸 이미지 업로드 및 미리보기
- 🤖 Gemini AI를 통한 프로필 사진 분석
- 📊 인물, 배경, 감성 점수 제공
- 💾 사용자 정보 및 이미지를 Google 시트/Drive에 자동 저장
- 📱 반응형 웹 디자인

## 🛠️ 기술 스택

- **Frontend**: HTML, CSS (Tailwind), JavaScript
- **Backend**: Netlify Functions
- **AI**: Google Gemini API
- **Storage**: Google Sheets + Google Drive
- **Hosting**: Netlify

## 💡 Apps Script 연동 방식의 특징

이 프로젝트의 Google Apps Script는 유지보수 편의성을 높이기 위해 독특한 방식으로 설계되었습니다.

**헤더 이름을 기반으로 한 동적 데이터 처리**
일반적으로 스크립트에서 시트 데이터를 처리할 때는 A열, B열처럼 열의 위치를 직접 지정하는 방식을 사용하기도 합니다. 하지만 이 방식은 시트의 열 순서가 바뀌면 스크립트가 오작동하는 치명적인 단점이 있습니다.

이 프로젝트는 이러한 문제를 해결하기 위해 다음과 같은 동적 처리 방식을 사용합니다.

1. **헤더 읽기**: 스크립트는 실행될 때마다 항상 시트의 첫 행(헤더)을 먼저 읽어 각 열의 이름과 위치를 파악합니다. (["요청ID", "타임스탬프", ...])

2. **이름으로 매칭**: 데이터를 저장하거나 업데이트할 때, 헤더 이름을 기준으로 정확한 열을 찾아냅니다.

3. **create (생성 시)**: headers.map()을 사용하여 시트의 헤더 순서와 동일한 순서로 데이터를 재정렬한 후 행을 추가합니다.

4. **update (수정 시)**: headers.indexOf("헤더이름")을 사용하여 수정할 열의 위치를 동적으로 찾아낸 후 값을 업데이트합니다.

**장점**
이러한 설계 덕분에 프론트엔드 개발과 데이터 관리(시트)가 분리되어 유지보수가 매우 편리합니다.

1. **유연성**: 구글 시트에서 열의 순서를 마음대로 변경해도 스크립트 코드를 수정할 필요가 없습니다. (예: '연락처' 열과 '이름' 열의 순서를 바꿔도 정상 작동)

2. **가독성**: 코드에서 getRange(row, 5)처럼 의미를 알 수 없는 숫자 대신 setCell("인물", ...)과 같이 명시적인 헤더 이름을 사용하므로, 코드의 의도를 파악하기 쉽습니다.

3. **확장성**: 나중에 새로운 데이터(열)를 추가하고 싶을 때, 시트에 헤더를 추가하고 스크립트의 rowMap 객체에 한 줄만 추가하면 되므로 확장이 매우 용이합니다.

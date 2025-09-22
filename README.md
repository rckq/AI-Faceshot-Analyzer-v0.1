# 🎯 AI 프로필 사진 분석기

AI를 활용한 프로필 사진 분석 및 평가 서비스입니다.

## 🚀 배포 및 설정

### 1. Netlify 환경 변수 설정
Netlify 대시보드에서 다음 환경 변수를 설정해주세요:
- `GEMINI_API_KEY`: Google Gemini API 키

### 2. Google Apps Script 설정 (데이터 수집용)

#### 2-1. Google 스프레드시트 생성
1. [Google 스프레드시트](https://sheets.google.com)에서 새 시트 생성
2. 시트 이름을 "Sheet1"로 유지 (또는 코드에서 수정)
3. 첫 번째 행에 헤더 추가: `타임스탬프`, `이름`, `연락처`, `이미지 URL`

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
 * 받은 데이터를 구글 시트에 기록하고, 이미지를 구글 드라이브에 저장합니다.
 */
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
    if (!sheet) {
      throw new Error("Sheet named 'Sheet1' not found. Please check the sheet name.");
    }

    const name = e.parameter.name;
    const contact = e.parameter.contact;
    const timestamp = e.parameter.timestamp;
    const imageBase64 = e.parameter.image;

    // --- Google Drive에 이미지 저장 ---
    // Base64 데이터에서 순수 데이터 부분만 추출하고 디코딩합니다.
    const decodedImage = Utilities.base64Decode(imageBase64.split(",")[1]);
    const imageBlob = Utilities.newBlob(decodedImage, "image/jpeg", `${name}_${timestamp}.jpg`);
    
    // 지정된 ID의 폴더를 찾습니다.
    const imageFolder = DriveApp.getFolderById(FOLDER_ID);
    
    // 폴더 안에 이미지 파일을 생성합니다.
    const imageFile = imageFolder.createFile(imageBlob);
    const imageUrl = imageFile.getUrl(); // 저장된 파일의 URL을 가져옵니다.

    // --- Google Sheet에 정보 기록 ---
    // 시트에는 이름, 연락처, 그리고 이미지 파일의 '링크'를 저장합니다.
    sheet.appendRow([timestamp, name, contact, imageUrl]);

    // 성공 응답을 JSON 형태로 반환합니다.
    return ContentService.createTextOutput(JSON.stringify({ "result": "success", "fileUrl": imageUrl }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // 오류 발생 시, 오류 메시지를 JSON 형태로 반환합니다.
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": error.message }))
      .setMimeType(ContentService.MimeType.JSON);
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
    Logger.log("Requesting Google Drive permission. Please follow the prompts. Error: " + e.message);
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

#### 2-5. 프론트엔드 코드 업데이트
`index.html` 파일의 `scriptURL` 변수를 새로 생성한 웹 앱 URL로 변경:

```javascript
const scriptURL = "여기에_새로_생성한_웹앱_URL_붙여넣기";
```

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

# フロントエンドCodexへの引き継ぎ: OAuth v3と独自Passkey

このファイルと隣の [`auth-client.ts`](./auth-client.ts) を読んでから、フロントエンドの既存ルーター・状態管理・画面に組み込んでください。これは現在のバックエンドに合わせたブラウザ用TypeScriptサンプルです。フロントエンド本体の変更や配備は行っていません。

## 最初に確認する設定

このサンプルは**ログインUI・OAuthコールバック・ログイン後のアプリ・パスキー登録画面が同じオリジン**の公開SPAを対象にします。APIのオリジンは別でも構いません。例:

| 設定 | 値の例 |
| --- | --- |
| ブラウザのオリジン | `https://app.example.com` |
| ログイン画面 | `https://app.example.com/login` |
| 登録済みredirect URI | `https://app.example.com/auth/callback` |
| API origin | `https://api.example.com` |
| OAuth client ID | `tips-web-v3` |
| APIのLOGIN_SERVER | `https://app.example.com` |
| APIのPASSKEY_ORIGIN | `https://app.example.com` |
| APIのPASSKEY_RP_ID | `app.example.com` |

実際の配備設定で置き換えてください。APIの `OAUTH_V3_CLIENTS` にclient IDと完全一致のredirect URIを登録し、`tokenEndpointAuthMethod: "none"` にします。**ブラウザにclient secret、Cognito secret、証明署名鍵を置かないでください。** API開発設定ではログインUIが `http://localhost:3000/login` に固定されています。

サンプルは単一client、クエリ・fragmentのない固定callback URLに限定しています。別オリジンのログインポータルや複数clientを使う場合は、その構成に合わせて設計を変えてください。sessionStorageもメモリ上のトークンも別オリジンから読めません。特に登録画面はPASSKEY_ORIGIN上でBearerを取得できる必要があります。URLでトークンを受け渡す変更はしないでください。

APIが別オリジンなら、フロントの実際のOrigin、POST、Content-Type、AuthorizationをCORSで許可します。Originヘッダーはブラウザに任せます。Referrer-Policy: no-referrerをフロントのHTTP応答にも設定し、ログイン・callbackページの第三者スクリプト、解析、URL収集を避けてください。Service WorkerやHTTPクライアントのキャッシュ・自動リトライから認証APIを除外します。

## サンプルを組み込む

フロントに `@simplewebauthn/browser` のv13系を導入し、実際のlockfileでバージョンを固定します。APIリポジトリにはブラウザ依存を追加していません。次のモジュールをブラウザ内で一度だけ作成します。SSRから実行しないでください。

```ts
// src/auth.ts — モジュール単位のsingleton。コンポーネント内で毎回作らない。
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { createAuthClient } from './auth-client'; // サンプルをコピーした場所

export const auth = createAuthClient({
  apiOrigin: 'https://api.example.com',
  clientId: 'tips-web-v3',
  redirectUri: 'https://app.example.com/auth/callback',
}, {
  register: optionsJSON => startRegistration({
    optionsJSON: optionsJSON as Parameters<typeof startRegistration>[0]['optionsJSON'],
  }),
  authenticate: optionsJSON => startAuthentication({
    optionsJSON: optionsJSON as Parameters<typeof startAuthentication>[0]['optionsJSON'],
  }),
});
```

型アサーションはAPIが返すSimpleWebAuthnのJSON optionsをアダプターへ渡すためのものです。challenge、user ID、credential IDを手動で変換したり、`navigator.credentials` の生データをJSON.stringifyしたりしないでください。ライブラリが返したJSON credentialをそのまま送ります。呼び出し形式は [SimpleWebAuthn browser公式資料](https://simplewebauthn.dev/docs/13.3.x/packages/browser) を参照してください。

### 画面と処理

1. アプリの「ログイン」ボタンから `await auth.beginAuthorization()`。stateとPKCE verifierをcryptoで生成し、このタブのsessionStorageに保存して `/v3/login/authorize` へ遷移します。verifierはURLへ入れません。
2. `/login` では `auth.readLoginRequest()` で入力を検証。ここで新しいstateやverifierを生成しません。パスワードフォームから `await auth.passwordLogin(username, password)`。送信中は二重操作を防ぎ、finallyでパスワードの入力値を消します。パスワードはログ・解析・ストレージへ保存しません。
3. パスキーログインでは `const finish = await auth.preparePasskeyLogin()` で準備後、「パスキーで続行」ボタンのクリックから直接 `await finish()`。準備と操作を二段階に分け、WebAuthnをユーザー操作から開始します。新しいボタン操作を受けるまで自動でfinishを実行しません。成功時はサーバの返したcallbackへ遷移します。
4. `/auth/callback` では最初に `await auth.completeCallback()`。state照合、URLからcode/stateの削除、コード交換が完了してからアプリを描画します。成功後のホーム画面への移動は**SPAルーターのreplace**を使います。`location.assign`/フルリロードではメモリのトークンが失われます。StrictMode等での二重実行は同じsingletonのPromiseにまとめられます。
5. APIへは `const bearer = await auth.accessToken()` を取得して `Authorization: Bearer ${bearer}` を付けます。認証が必要な既存APIのパスは個別に確認します。トークン取得に失敗したらログイン画面への導線を出します。業務APIの401で変更系要求を無条件に再送しません。
6. パスキー登録画面では `const finish = await auth.prepareRegistration()` の後、「この端末に登録」ボタンから直接 `await finish()`。登録開始時に捕捉した同一Bearerで完了します。成功表示は `/register` の `{success:true}` を受け取った後です。
7. 「この画面からログアウト」は `auth.clearSession()` を呼び、SPA内のユーザー情報・キャッシュも消します。これはCognito全体の失効や他端末のログアウトではありません。

各prepare/finishのボタンは処理中disabledにし、競合する認証操作を同時に開始しないでください。finishは成功・キャンセル・失敗を問わず一回限りです。再操作では古いfinishを捨て、prepareからやり直します。画面遷移後の古い非同期結果でボタンを復活させないようにしてください。APIのチャレンジ期限は5分です。

## HTTP契約（追加フィールドを送らない）

認可パラメータAは次の6項目だけです。scope、nonce、response_modeなどは現在受け付けません。

```ts
const A = {
  response_type: 'code', client_id: 'tips-web-v3',
  redirect_uri: 'https://app.example.com/auth/callback',
  code_challenge: 'SHA256(verifier)をbase64urlにした43文字',
  code_challenge_method: 'S256', state: '暗号学的乱数',
};
```

| API | 送信形式と内容 | 成功応答 |
| --- | --- | --- |
| GET `/v3/login/authorize` | Aをクエリに設定、ブラウザ遷移 | LOGIN_SERVERの`/login`へ302 |
| POST `/v3/login` | JSON `{...A, username, password}` | `{redirect_uri}` |
| POST `/v1/authn/login` | JSON A | `{requestId, publicKey}` |
| POST `/v1/authn/verify` | JSON `{requestId, credential}` | `{redirect_uri}` |
| POST `/v3/login/token` | form: `grant_type=authorization_code`, `client_id`, `redirect_uri`, `code`, `code_verifier` | 下記トークン応答 |
| POST `/v3/refresh` | form: `grant_type=refresh_token`, `client_id`, `refresh_token` | 下記トークン応答 |
| POST `/v1/authn/create` | JSON `{}`、Bearer必須 | `{requestId, publicKey}` |
| POST `/v1/authn/register` | JSON `{requestId, credential}`、createと同一Bearer | `{success:true}` |

formは `application/x-www-form-urlencoded` と `URLSearchParams` を使います。認可コードは120秒、一回限りです。callbackを受け取ったらすぐ交換します。トークン応答は `{access_token, token_type:"Bearer", expires_in, refresh_token}`。ID tokenはありません。OpenID ConnectではなくOAuthです。ユーザー表示情報はアクセストークン取得後に既存プロフィールAPIから取得してください。

`refresh_token` は**Cognitoが返した値そのもの**です。不透明な文字列として保持し、JWTとして解析、base64変換、切詰めをしません。更新応答のrefresh_tokenを毎回置き換えます。同じ値が返る構成もあります。Cognitoへ直接更新要求を送らず、このAPIの `/v3/refresh` を使います。

## セッションと更新の注意

サンプルはaccess/refresh tokenをメモリだけに保持します。リロード・タブを閉じる操作で再ログインが必要です。sessionStorageには認可前のstate/verifierだけを保存します。state保存のサンプル側期限は10分で、コードやサーバチャレンジの期限とは別です。

更新は同じsingleton内で一つのPromiseにまとめます。タブ間でトークンを共有しないため、タブごとに独立してログインします。永続ログインが必要なら、別途BFF等の設計またはタブ間の排他と最新トークンの共有を実装してください。**単純にlocalStorage/sessionStorageへトークン保存する変更だけでは不十分**です。複製タブも考慮が必要です。

ローテーション済みの旧refresh tokenを再利用すると、v3の同じ更新セッション全体が失効します。ネットワーク切断でもサーバで更新済みの可能性があるため、自動再送しません。サンプルは更新失敗時にローカルセッションを破棄し、再ログインを要求します。コード交換失敗時も同じコードを再送せず認可開始からやり直します。v3更新期限は初回ログインから最大30日で、Cognito側の期限によって短くなります。

## 移行・エラー・実機確認

OAuth v3のエラーには固定の `error_id` が追加されています。サンプルは `AuthError.errorId` で保持するので、問い合わせ用に表示できます。対応表は [../oauth-v3-error-ids.md](../oauth-v3-error-ids.md) を参照してください。HTTP statusとOAuth `error` の意味は変わりません。

既存の独自パスキーは全員再登録が必要です。パスワードまたはアカウント回復でログインした後に登録を案内してください。古いパスキーがOSの候補に出ても新実装では使えません。アプリからOS内の鍵を自動削除することはできません。鍵の一覧・削除APIも今回の実装にはありません。

旧 `/v1/authn/verify/internal` は410です。旧 `challenge`、username、userId、Cognito Sessionをブラウザから検証APIへ送る処理を削除します。別機能のCognitoネイティブ `/v1/passkey/*` や旧login APIへフォールバックしないでください。

| 条件 | UI対応 |
| --- | --- |
| WebAuthnキャンセル・タイムアウト | キャンセルを案内し、prepareから再試行可能にする |
| 400 / invalid_request | フィールド・client・redirect設定を修正。自動再試行しない |
| 401 / access_denied | ログインなら認証失敗。登録なら再ログイン後に最初から登録 |
| invalid_grant / コード交換・更新の通信失敗 | 再ログイン。古いcode/refresh tokenを再送しない |
| 403 | Origin設定を確認。旧APIへ切り替えない |
| 409 | 登録済み資格情報。上書き成功扱いにしない |
| 415 | トークンAPIのContent-Typeを修正 |
| 429 | Retry-Afterを尊重しボタンを一時無効化。更新失敗後は再ログイン |
| 5xx | 一般的なエラー表示。秘密・レスポンス全文を画面やログに出さない |

フロント側の受入確認:

- パスワード→callback→APIアクセス→再登録→パスキーログインの一連の操作。
- state不一致・欠落・重複、外部redirect、callback再読込、React二重実行で不正な交換をしない。
- 同時API要求で更新が1回、refresh tokenの`+ / =`がそのまま復元できるform、更新通信断で旧tokenを再送しない。
- 登録create/registerのBearerが同じ。キャンセル・5分経過・登録中のログアウトで古い要求を再使用しない。
- iOS/Safari、Android、デスクトップの実機、同期パスキー、セキュリティキー。旧パスキーの拒否と回復導線。
- APIへのCORSプリフライトと、フロントのReferrer-Policy、Service Worker、監視・解析で秘密が記録されないこと。

バックエンドの配備条件は [`../passkey-v2.md`](../passkey-v2.md)、OAuth詳細は [`../oauth-v3.md`](../oauth-v3.md) を参照してください。新DBテーブルとCognito Lambdaの切替が前提です。

## サンプルの検証

APIリポジトリのルートで `node docs/frontend-auth-v3/auth-client.test.cjs` を実行できます。PKCE/state、二重callback、更新の直列化と通信断、登録時Bearer固定、ログアウト中の更新をモックで検証します。実ブラウザ・CORS・Cognito・認証器との接続はこのテストに含まれません。

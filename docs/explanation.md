# 電卓アプリケーション 解説（解法・コード例集）

このドキュメントは、[README.md](../README.md) の各課題に対する解法（コード例）をまとめたものです。まずは自力で設計・実装に挑戦し、最後に答え合わせとして参照してください。

> 🗂️ これは全ステップ（Step 1〜5）が揃った完成版の解説です。

このコードは「**1つの大きな処理を、役割ごとの小さな関数に分ける**」という設計方針で書かれています。イベントの登録（ボタンが押されたら何を呼ぶか）と、実際の処理（何をするか）を分けることで、各部分の役割が読みやすくなります。

### 関数の全体像（設計マップ）

| 役割 | 関数 |
|------|------|
| ディスプレイの表示を更新する | `updateDisplay(value)` |
| 計算状態をすべてリセットする | `clearAll()` |
| 数字・小数点の入力を処理する | `inputDigit(value)` |
| 演算子の入力を処理する | `inputOperator(op)` |
| `=` が押されたときの計算 | `handleEquals()` |
| 2数と演算子から答えを求める（純粋な計算） | `calculate(n1, op, n2)` |
| ドラッグ移動機能を初期化する | `initDrag()` |

---

## Step 1: 画面の表示 (HTML/CSS)

ドラッグ移動用の「つかむ場所（ハンドル）」として、ディスプレイの上に `drag_handle` を用意しています。これにより「ボタンを押す操作」と「電卓を動かす操作」が混ざらない設計にしています（ドラッグ機能は後のステップで実装します）。

**HTML (index.html)**
```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/style.css">
    <title>電卓のサンプル</title>
</head>
<body>
    <div class="calc_app">
        <div class="drag_handle">電卓（ここをドラッグして移動）</div>
        <div class="display"></div>
        <div class="box">
            <div class="reset">AC</div>
            <div class="switch_dummy"></div>
            <div class="switch_dummy"></div>
            <div class="calculation">/</div>
            <div class="switch">7</div>
            <div class="switch">8</div>
            <div class="switch">9</div>
            <div class="calculation">*</div>
            <div class="switch">4</div>
            <div class="switch">5</div>
            <div class="switch">6</div>
            <div class="calculation">-</div>
            <div class="switch">1</div>
            <div class="switch">2</div>
            <div class="switch">3</div>
            <div class="calculation">+</div>
            <div class="switch">0</div>
            <div class="switch">.</div>
            <div class="switch_dummy"></div>
            <div class="result">=</div>
        </div>
    </div>
</body>
</html>
```

**CSS (style.css)**
```css
.calc_app {
	border: 1px solid #ccc;
	padding: 10px;
	position: fixed;
	text-align: center;
	background-color: #f0f0f0;
	border-radius: 8px;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* ドラッグでつかむ場所（ヘッダ） */
.drag_handle {
	width: 200px;
	height: 24px;
	line-height: 24px;
	margin-bottom: 8px;
	background-color: #4a90d9;
	color: #fff;
	border-radius: 5px;
	font-size: 12px;
	cursor: move;          /* 「動かせる」と分かるカーソル */
	user-select: none;     /* ドラッグ中に文字が選択されるのを防ぐ */
}

.display {
	border: 1px solid #333;
	width: 200px;
	height: 50px;
	margin-bottom: 10px;
	line-height: 50px;
	text-align: right;
	overflow: hidden;
	padding: 0 10px;
	background-color: #e0e0e0;
	border-radius: 5px;
}

.box {
	width: 200px;
	display: flex;
	flex-wrap: wrap;
}

.switch, .switch_dummy, .reset, .result, .calculation {
	height: 50px;
	line-height: 50px;
	text-align: center;
	border: 1px solid #ccc;
	box-sizing: border-box;
	cursor: pointer;
	margin: 1px;
	width: calc(25% - 2px);
	user-select: none;
}

/* ボタンの種類ごとに色を変えて見やすくする */
.calculation {
	background-color: #f5a623;
	color: #fff;
}

.reset {
	background-color: #d0021b;
	color: #fff;
}

.result {
	background-color: #4a90d9;
	color: #fff;
}

.switch:hover, .reset:hover, .result:hover, .calculation:hover {
	opacity: 0.8;
}
```

---

## Step 2: イベントの設定 (JavaScript)

この段階では計算はまだ行わず、「どのボタンが押されたか」をコンソールに出して確認します。HTML要素の取得もここでまとめて行っておきます。

`app.js` に以下のコードを記述します。
```javascript
// --- 1. HTML要素の取得 ---
const display = document.querySelector('.display');
const switches = document.querySelectorAll('.switch');          // 数字・小数点
const calculations = document.querySelectorAll('.calculation'); // 四則演算
const resets = document.querySelectorAll('.reset');             // AC
const results = document.querySelectorAll('.result');           // =

// --- 2. イベントリスナーの設定（この時点ではコンソール出力のみ） ---
switches.forEach(button => button.addEventListener('click', e => console.log(e.target.textContent)));
calculations.forEach(button => button.addEventListener('click', e => console.log(e.target.textContent)));
resets.forEach(button => button.addEventListener('click', () => console.log('AC')));
results.forEach(button => button.addEventListener('click', () => console.log('=')));
```

---

## Step 3: 計算機能の実装（基本編）

### 3.1.1. 状態管理用の変数を準備しよう

電卓は「今どんな状態か」を覚えておく必要があります。その記憶役が次の4つの変数です。

```javascript
// --- 3. 電卓の状態（覚えておく情報） ---
let currentInput = "0";                // 今ディスプレイに表示している数値（文字列）
let operator = "";                     // 押された演算子（+ - * /）
let left = null;                       // 計算の左辺（数値）。まだ無ければ null
let isWaitingForSecondOperand = false; // 2番目の数値の入力待ちか（演算子の直後か）
```

> **設計のポイント**: `currentInput` は画面表示と同じく「文字列」、`left` は計算に使うので「数値」、`isWaitingForSecondOperand` は「はい/いいえ」なので「真偽値」と、情報の性質に合わせて型を選んでいます。

### 3.1.2. 便利な関数を準備しよう

「表示を更新する」「状態をリセットする」という、何度も使う処理を関数にまとめます。

```javascript
// ディスプレイの表示を更新する
function updateDisplay(value) {
    display.textContent = value;
}

// すべての状態を初期値に戻す
function clearAll() {
    currentInput = "0";
    operator = "";
    left = null;
    isWaitingForSecondOperand = false;
    updateDisplay("0");
}

// ACボタンが押されたら clearAll を呼ぶ
resets.forEach(button => button.addEventListener('click', clearAll));

// 初期表示
updateDisplay(currentInput);
```

> **設計のポイント**: イベント登録は `clearAll` を「呼ぶだけ」にしています。**「いつ呼ぶか（イベント登録）」と「何をするか（関数の中身）」を分ける**のが、読みやすいコードのコツです。

### 3.2.1. 数字・小数点ボタンの処理

数字・小数点が押されたときの処理を `inputDigit` という関数にまとめ、ボタンのクリックからはこの関数を呼ぶだけにします。

```javascript
// 数字・小数点が押されたときの処理
function inputDigit(value) {
    if (isWaitingForSecondOperand) {
        // 2番目の数値の最初の入力 → 表示を新しい数値で上書き
        currentInput = value;
        isWaitingForSecondOperand = false;
    } else if (currentInput === "0" && value !== ".") {
        // 先頭の "0" は上書きする（例: 0 → 5）
        currentInput = value;
    } else if (value === "." && !currentInput.includes(".")) {
        // 小数点はまだ入っていないときだけ追加
        currentInput += value;
    } else if (value !== ".") {
        // それ以外の数字は末尾に追記
        currentInput += value;
    }
    updateDisplay(currentInput);
}

// 数字・小数点ボタンに登録（押された文字を渡すだけ）
switches.forEach(button => {
    button.addEventListener('click', e => inputDigit(e.target.textContent));
});
```

### 3.3.1. 演算子ボタンの処理（状態保存と押し間違い対応）

演算子が押されたときの処理を `inputOperator` 関数にまとめます。まずは基本版（1回だけの計算に対応）です。

```javascript
// 演算子が押されたときの処理（基本版）
function inputOperator(op) {
    // 押し間違い（演算子を続けて押した）→ 演算子だけ差し替える
    if (isWaitingForSecondOperand) {
        operator = op;
        return;
    }

    left = parseFloat(currentInput);  // 今の数値を左辺として保存
    operator = op;                    // 押された演算子を保存
    isWaitingForSecondOperand = true; // 次は2番目の数値の入力待ち
}

// 演算子ボタンに登録
calculations.forEach(button => {
    button.addEventListener('click', e => inputOperator(e.target.textContent));
});
```

### 3.3.2. 計算実行関数 `calculate` の作成

実際の計算だけを担当する関数です。**状態（変数）には触れず、受け取った値だけで答えを返す**ので、テストも理解もしやすくなります。

```javascript
// 小数計算の誤差（例: 0.1 + 0.2 = 0.30000000000000004）を抑えるための丸め桁数
const ROUND_DIGITS = 10;
const ROUND_FACTOR = 10 ** ROUND_DIGITS; // = 10000000000

// 2つの数値と演算子から答えを求める（純粋な計算のみ）
function calculate(n1, op, n2) {
    let result = 0;
    switch (op) {
        case '+': result = n1 + n2; break;
        case '-': result = n1 - n2; break;
        case '*': result = n1 * n2; break;
        case '/':
            if (n2 === 0) return "Error"; // 0では割れない
            result = n1 / n2;
            break;
        default: return n2;
    }
    // 誤差を抑えるため、指定した桁で丸める
    return Math.round(result * ROUND_FACTOR) / ROUND_FACTOR;
}
```

### 3.3.3. `=` ボタンの処理

`=` が押されたときの処理を `handleEquals` 関数にまとめます。

```javascript
// = が押されたときの処理
function handleEquals() {
    // 計算に必要な情報（左辺・演算子・2番目の数値）が揃っていなければ何もしない
    if (left === null || operator === "" || isWaitingForSecondOperand) return;

    const right = parseFloat(currentInput);
    const result = calculate(left, operator, right);

    // 0除算などのエラー
    if (result === "Error") {
        clearAll();
        updateDisplay("Error");
        return;
    }

    updateDisplay(result);

    // 計算結果を使って続けて計算できるよう、状態を更新する
    currentInput = result.toString();
    left = result;
    operator = "";
    isWaitingForSecondOperand = true;
}

// = ボタンに登録
results.forEach(button => button.addEventListener('click', handleEquals));
```

---

## Step 4: 計算機能の実装（発展編）

### 4.1. 連続計算 (A + B + C ...) への対応

`1 + 2 + 3 =` のように演算子を続けて使えるよう、**Step 3.3.1 で作った `inputOperator` 関数の中身だけを差し替えます**。関数を分けておいたおかげで、呼び出し側（イベント登録）はそのままで、この関数の中身を直すだけで機能を拡張できます。

```javascript
// 演算子が押されたときの処理（連続計算に対応した完成版）
function inputOperator(op) {
    // 押し間違い（演算子を続けて押した）→ 演算子だけ差し替える
    if (isWaitingForSecondOperand) {
        operator = op;
        return;
    }

    if (left === null) {
        // 初回の計算 → 今の数値を左辺として保存するだけ
        left = parseFloat(currentInput);
    } else {
        // 連続計算 → ここまでの計算を実行して結果を左辺にする
        const right = parseFloat(currentInput);
        const result = calculate(left, operator, right);

        if (result === "Error") {
            clearAll();
            updateDisplay("Error");
            return;
        }

        updateDisplay(result);
        left = result; // 計算結果を次の左辺にする
    }

    operator = op;                    // 新しい演算子を保存
    isWaitingForSecondOperand = true; // 次は2番目の数値の入力待ち
}
```

> **設計のポイント**: `calculate`（純粋な計算）と `inputOperator`（状態の管理）を分けてあるので、連続計算の追加は `inputOperator` の中だけで完結します。役割を分けておくと、後からの変更がラクになります。

---

## Step 5: 画面移動機能の実装

電卓をドラッグで動かす機能を `initDrag` 関数にまとめます。マウス操作は次の3つの役割に分かれます。

| イベント | 役割 |
|----------|------|
| `mousedown`（ハンドル上） | ドラッグ開始。つかんだ位置を記録する |
| `mousemove`（画面全体） | ドラッグ中なら、マウスの移動量に合わせて電卓を動かす |
| `mouseup`（画面全体） | ドラッグ終了 |

**設計上の工夫:**
- `mousedown` は**ハンドル（`drag_handle`）の上だけ**で受け取る。こうすると数字ボタンを押してもドラッグが始まらない。
- `mousemove` / `mouseup` は **`document`（画面全体）**に登録する。マウスが電卓の外に出ても追従でき、途中で動きが止まらない。

```javascript
// --- 画面移動機能 ---
function initDrag() {
    const calcApp = document.querySelector('.calc_app');
    const handle = document.querySelector('.drag_handle');

    let isDragging = false;  // ドラッグ中かどうか
    let startX, startY;      // ドラッグ開始時のマウス位置
    let startLeft, startTop; // ドラッグ開始時の電卓の位置

    // ハンドルを押したらドラッグ開始
    handle.addEventListener('mousedown', function (e) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = calcApp.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        e.preventDefault(); // ドラッグ中の文字選択を防ぐ
    });

    // 画面のどこでマウスが動いても、ドラッグ中なら電卓を移動
    document.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
        const dx = e.clientX - startX; // 横の移動量
        const dy = e.clientY - startY; // 縦の移動量
        calcApp.style.left = (startLeft + dx) + 'px';
        calcApp.style.top = (startTop + dy) + 'px';
    });

    // どこでマウスを離してもドラッグ終了
    document.addEventListener('mouseup', function () {
        isDragging = false;
    });
}

// ドラッグ機能を有効にする
initDrag();
```

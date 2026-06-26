// =============================================================
// 電卓アプリケーション サンプルプログラム（完成版）
//
// 設計方針: 1つの大きな処理を、役割ごとの小さな関数に分ける。
//   - イベント登録（いつ呼ぶか） と 処理本体（何をするか） を分離
//   - 解説は docs/explanation.md を参照
// =============================================================

// --- 1. HTML要素の取得 ---
const display = document.querySelector('.display');
const switches = document.querySelectorAll('.switch');          // 数字・小数点
const calculations = document.querySelectorAll('.calculation'); // 四則演算
const resets = document.querySelectorAll('.reset');             // AC
const results = document.querySelectorAll('.result');           // =

// --- 2. 電卓の状態（覚えておく情報） ---
let currentInput = "0";                // 今ディスプレイに表示している数値（文字列）
let operator = "";                     // 押された演算子（+ - * /）
let left = null;                       // 計算の左辺（数値）。まだ無ければ null
let isWaitingForSecondOperand = false; // 2番目の数値の入力待ちか（演算子の直後か）

// 小数計算の誤差（例: 0.1 + 0.2 = 0.30000000000000004）を抑えるための丸め桁数
const ROUND_DIGITS = 10;
const ROUND_FACTOR = 10 ** ROUND_DIGITS; // = 10000000000

// --- 3. 便利な関数 ---

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

// --- 4. 入力処理 ---

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

// --- 5. 計算 ---

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

// --- 6. イベント登録（押されたら対応する関数を呼ぶだけ） ---
switches.forEach(button => {
    button.addEventListener('click', e => inputDigit(e.target.textContent));
});
calculations.forEach(button => {
    button.addEventListener('click', e => inputOperator(e.target.textContent));
});
resets.forEach(button => button.addEventListener('click', clearAll));
results.forEach(button => button.addEventListener('click', handleEquals));

// 初期表示
updateDisplay(currentInput);

// --- 7. 画面移動機能 ---
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

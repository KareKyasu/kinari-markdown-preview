// プレビュー先頭に和紙切り替え用のマーカー要素を挿入する。
// kinari.css が body:has(.kinari-paper-*) で配色を切り替える。
// プレビュー右上のボタンから和紙を選べる。
const vscode = require('vscode');

const PAPERS = [
	{ id: 'kinari', label: '生成り', description: 'きなり — 晒さぬ木綿の、ほんのり黄みを帯びた白。いつもの一枚' },
	{ id: 'torinoko', label: '鳥の子', description: 'とりのこ — 鶏の卵の殻を思わせる、淡い玉子色' },
	{ id: 'usuzakura', label: '薄桜', description: 'うすざくら — 春霞にほどける、桜の花びらのごく淡い紅' },
	{ id: 'wakana', label: '若菜', description: 'わかな — 雪間に萌え出る若菜の、やさしい黄緑' },
	{ id: 'aijiro', label: '藍白', description: 'あいじろ — 藍甕にほんのひと浸し。もっとも白に近い藍' },
	{ id: 'kai', label: '海', description: 'かい — 凪の浅瀬に陽の差すような、澄んだ青緑' },
	{ id: 'shironeri', label: '白練', description: 'しろねり — 練り上げた絹のような、ほのかに温もりのある白' },
];
const PAPER_IDS = PAPERS.map((p) => p.id);

// 一覧で選んでいる途中の和紙（確定前のプレビュー用。設定には保存しない）
let previewPaper;

function currentPaper() {
	if (previewPaper) {
		return previewPaper;
	}
	const paper = vscode.workspace.getConfiguration('kinari').get('paper', 'kinari');
	return PAPER_IDS.includes(paper) ? paper : 'kinari';
}

function refreshPreview() {
	return vscode.commands.executeCommand('markdown.preview.refresh');
}

// ワークスペース設定で指定されていればそちらを、なければユーザー設定を書き換える
async function savePaper(paper) {
	const config = vscode.workspace.getConfiguration('kinari');
	const target = config.inspect('paper')?.workspaceValue !== undefined
		? vscode.ConfigurationTarget.Workspace
		: vscode.ConfigurationTarget.Global;
	await config.update('paper', paper, target);
}

function selectPaper() {
	const saved = currentPaper();
	const quickPick = vscode.window.createQuickPick();
	quickPick.title = 'Kinari: 和紙を選ぶ';
	quickPick.placeholder = '矢印で巡ると頁の色が移ろいます（Enter で決まり / Esc で元の色へ）';
	quickPick.items = PAPERS.map((p) => ({ ...p, label: p.id === saved ? `$(check) ${p.label}` : p.label }));
	quickPick.activeItems = quickPick.items.filter((item) => item.id === saved);

	let accepted = false;
	quickPick.onDidChangeActive(([item]) => {
		if (item && item.id !== currentPaper()) {
			previewPaper = item.id;
			refreshPreview();
		}
	});
	quickPick.onDidAccept(async () => {
		accepted = true;
		const [item] = quickPick.selectedItems;
		quickPick.hide();
		previewPaper = undefined;
		if (item) {
			await savePaper(item.id);
		}
		refreshPreview();
	});
	quickPick.onDidHide(() => {
		if (!accepted) {
			previewPaper = undefined;
			refreshPreview();
		}
		quickPick.dispose();
	});
	quickPick.show();
}

function activate(context) {
	context.subscriptions.push(
		vscode.commands.registerCommand('kinari.selectPaper', selectPaper),
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('kinari.paper')) {
				refreshPreview();
			}
		})
	);

	return {
		extendMarkdownIt(md) {
			md.core.ruler.push('kinari_paper_marker', (state) => {
				const token = new state.Token('html_block', '', 0);
				token.content = `<div class="kinari-paper-${currentPaper()}"></div>\n`;
				state.tokens.unshift(token);
			});
			return md;
		},
	};
}

function deactivate() {}

module.exports = { activate, deactivate, PAPERS };

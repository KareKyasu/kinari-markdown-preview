// プレビュー先頭に和紙切り替え用のマーカー要素を挿入する。
// kinari.css が body:has(.kinari-paper-*) で配色を切り替える。
// プレビュー右上のボタンから和紙を選べる。
const vscode = require('vscode');

const PAPERS = [
	{ id: 'kinari', label: '生成り', description: 'きなり — 漂白していない、ほんのり黄みの白（既定）' },
	{ id: 'torinoko', label: '鳥の子', description: 'とりのこ — 卵の殻のような、少し濃いめの和紙色' },
	{ id: 'usuzakura', label: '薄桜', description: 'うすざくら — 桜の花びらのような、ごく淡い紅' },
	{ id: 'wakana', label: '若菜', description: 'わかな — 春の若菜のような、淡い黄緑' },
	{ id: 'aijiro', label: '藍白', description: 'あいじろ — 藍染めのいちばん淡い、白に近い水色' },
	{ id: 'shironeri', label: '白練', description: 'しろねり — 練り絹のような、ほとんど白' },
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
	quickPick.placeholder = '矢印キーで選ぶとプレビューに反映されます（Enter で決定 / Esc で戻す）';
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

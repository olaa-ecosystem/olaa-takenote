/* Olaa Takenote: iPad home prototype. Plain browser JavaScript, no dependencies. See ../README.md */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let dockMode = 'float', relayoutDock = null, dockSide = 'bottom', dockCorner = null;      // the toolbar sits at the centre of a side, or folded in a corner      // dockCorner: 'tl', 'tr', 'bl' or 'br' while folded in a corner
try { const v = localStorage.getItem('olaa-dock-side'); if (['top', 'bottom', 'left', 'right'].includes(v)) dockSide = v; } catch (_) {}
let Z = 1, zx = 0, zy = 0, zpan = null, zAnim = 0, zSettleT = 0;      // zoom of the page inside its window, and the visible corner in page units
try { localStorage.removeItem('olaa-dock'); } catch (_) {}      // the old Fixed setting is gone
const LANGS = [['vi', 'VN', 'Tiếng Việt', 'vi-VN'], ['en', 'EN', 'English', 'en-GB'], ['ja', 'JP', '日本語', 'ja-JP'], ['ko', 'KR', '한국어', 'ko-KR'], ['fr', 'FR', 'Français', 'fr-FR'], ['zh', 'CN', '中文', 'zh-CN']];
const STAR = (cx, cy, R, rot = -90) => { let d = ''; for (let i = 0; i < 10; i++) { const r = i % 2 ? R * .382 : R, a = (rot + i * 36) * Math.PI / 180; d += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(2) + ' ' + (cy + r * Math.sin(a)).toFixed(2); } return `<path d="${d}Z"/>`; };
const FLAG_SVG = {
  vi: `<rect width="30" height="30" fill="#da251d"/><g fill="#ffcd00">${STAR(15, 15.6, 8.4)}</g>`,
  en: `<rect width="30" height="30" fill="#012169"/><path d="M-15 0L45 30M45 0L-15 30" stroke="#fff" stroke-width="6"/><path d="M-15 0L15 15M45 30L15 15" stroke="#c8102e" stroke-width="2.4" transform="translate(-1.2 1.2)"/><path d="M45 0L15 15M-15 30L15 15" stroke="#c8102e" stroke-width="2.4" transform="translate(1.2 1.2)"/><path d="M15 0v30M0 15h30" stroke="#fff" stroke-width="10"/><path d="M15 0v30M0 15h30" stroke="#c8102e" stroke-width="6"/>`,
  ja: `<rect width="30" height="30" fill="#fff"/><circle cx="15" cy="15" r="8" fill="#bc002d"/>`,
  ko: `<rect width="30" height="30" fill="#fff"/><g transform="rotate(33.7 15 15)"><circle cx="15" cy="15" r="7" fill="#0047a0"/><path d="M8 15a7 7 0 0 1 14 0a3.5 3.5 0 0 1-7 0a3.5 3.5 0 0 0-7 0z" fill="#cd2e3a"/></g>
    <g fill="#000">${[[-56.3, 0], [56.3, 0], [123.7, 0], [-123.7, 0]].map(([a]) => `<g transform="rotate(${a} 15 15)"><rect x="12.6" y="1.6" width="4.8" height=".9"/><rect x="12.6" y="2.9" width="4.8" height=".9"/><rect x="12.6" y="4.2" width="4.8" height=".9"/></g>`).join('')}</g>`,
  fr: `<rect width="10" height="30" fill="#002395"/><rect x="10" width="10" height="30" fill="#fff"/><rect x="20" width="10" height="30" fill="#ed2939"/>`,
  zh: `<rect width="30" height="30" fill="#ee1c25"/><g fill="#ffde00">${STAR(10, 11, 5.4)}${STAR(16.5, 5.5, 1.7, -60)}${STAR(19, 8.6, 1.7, -75)}${STAR(19, 12.6, 1.7, -95)}${STAR(16.5, 15.6, 1.7, -110)}</g>`,
};
const flagSVG = (c, px) => `<svg class="flagsvg" viewBox="0 0 30 30" width="${px}" height="${px}" aria-hidden="true"><defs><clipPath id="fc-${c}-${px}"><circle cx="15" cy="15" r="15"/></clipPath></defs><g clip-path="url(#fc-${c}-${px})">${FLAG_SVG[c]}</g></svg>`;
const FLAG = { vi: '1f1fb-1f1f3', en: '1f1ec-1f1e7', ja: '1f1ef-1f1f5', ko: '1f1f0-1f1f7', fr: '1f1eb-1f1f7', zh: '1f1e8-1f1f3' };      // national flags, drawn as emoji
// English is the key; the columns are vi, ja, ko, fr, zh
const I18N = {
  'New note': ['Ghi chú mới', '新規ノート', '새 노트', 'Nouvelle note', '新建笔记'],
  'Import': ['Nhập', '読み込む', '가져오기', 'Importer', '导入'],
  'Files': ['Tệp', 'ファイル', '파일', 'Fichiers', '文件'],
  'Language': ['Ngôn ngữ', '言語', '언어', 'Langue', '语言'],
  "How's today?": ['Hôm nay thế nào?', '今日はどう?', '오늘은 어때요?', "Comment ça va aujourd'hui ?", '今天怎么样?'],
  'Select files': ['Chọn tệp', 'ファイルを選択', '파일 선택', 'Sélectionner', '选择文件'],
  'Group': ['Gộp nhóm', 'まとめる', '묶기', 'Grouper', '编组'],
  'Change icon': ['Đổi biểu tượng', 'アイコンを変更', '아이콘 변경', "Changer l'icône", '更换图标'],
  'Delete': ['Xoá', '削除', '삭제', 'Supprimer', '删除'],
  'All files': ['Tất cả tệp', 'すべてのファイル', '모든 파일', 'Tous les fichiers', '全部文件'],
  'All files · {n}': ['Tất cả tệp · {n}', 'すべてのファイル · {n}', '모든 파일 · {n}', 'Tous les fichiers · {n}', '全部文件 · {n}'],
  'Sort by': ['Sắp xếp', '並べ替え', '정렬', 'Trier par', '排序'],
  'Date': ['Ngày', '日付', '날짜', 'Date', '日期'],
  'Name': ['Tên', '名前', '이름', 'Nom', '名称'],
  'Type': ['Loại', '種類', '종류', 'Type', '类型'],
  'Size': ['Dung lượng', 'サイズ', '크기', 'Taille', '大小'],
  '{n} selected': ['Đã chọn {n}', '{n}件を選択', '{n}개 선택됨', '{n} sélectionné(s)', '已选 {n} 项'],
  'Delete {n}?': ['Xoá {n} tệp?', '{n}件を削除?', '{n}개 삭제?', 'Supprimer {n} ?', '删除 {n} 项?'],
  'Tap again to delete': ['Chạm lần nữa để xoá', 'もう一度タップで削除', '한 번 더 누르면 삭제', 'Touchez encore pour supprimer', '再点一次删除'],
  'Apple Pencil draws · one finger moves · pinch to zoom': ['Apple Pencil để viết · một ngón để kéo · chụm để phóng to', 'Apple Pencilで書く · 1本指で移動 · ピンチでズーム', 'Apple Pencil로 쓰기 · 한 손가락으로 이동 · 핀치로 확대', 'Apple Pencil pour écrire · un doigt déplace · pincez pour zoomer', 'Apple Pencil 书写 · 单指移动 · 双指缩放'],
  'Start with one line.': ['Bắt đầu bằng một dòng thôi.', 'まずは一行から。', '한 줄부터 시작해요.', 'Commencez par une ligne.', '从一行开始。'],
  'Small notes count too.': ['Ghi chú nhỏ cũng đáng giá.', '小さなメモも大切。', '작은 메모도 소중해요.', 'Les petites notes comptent aussi.', '小小的笔记也有意义。'],
  'Write it down. Let it settle.': ['Viết ra, rồi để lòng lắng lại.', '書き出して、心を落ち着けて。', '적어 두고, 마음을 내려놓아요.', 'Écrivez-le. Laissez reposer.', '写下来，让心安静下来。'],
  'Your page, your pace.': ['Trang của bạn, nhịp của bạn.', 'あなたのページ、あなたのペースで。', '나의 페이지, 나의 속도로.', 'Votre page, votre rythme.', '你的页面，你的节奏。'],
  'One thought is enough to begin.': ['Một ý nghĩ là đủ để bắt đầu.', 'ひとつの思いから始めよう。', '생각 하나면 시작하기 충분해요.', 'Une pensée suffit pour commencer.', '一个念头就足以开始。'],
  '1 stroke': ['1 nét', '1画', '1획', '1 trait', '1 笔'],
  '{n} strokes': ['{n} nét', '{n}画', '{n}획', '{n} traits', '{n} 笔'],
  'Draft · not saved': ['Nháp · chưa lưu', '下書き · 未保存', '초안 · 저장 안 됨', 'Brouillon · non enregistré', '草稿 · 未保存'],
  'Not saved': ['Chưa lưu', '未保存', '저장 안 됨', 'Non enregistrée', '未保存'],
  'Saved': ['Đã lưu', '保存済み', '저장됨', 'Enregistrée', '已保存'],
  'Closed': ['Đã đóng', '閉じています', '닫힘', 'Fermée', '已关闭'],
  'Open': ['Mở', '開く', '열기', 'Ouvrir', '打开'],
  'Save': ['Lưu', '保存', '저장', 'Enregistrer', '保存'],
  'Open this note': ['Mở ghi chú này', 'このノートを開く', '이 노트 열기', 'Ouvrir cette note', '打开这条笔记'],
  'Save this note': ['Lưu ghi chú này', 'このノートを保存', '이 노트 저장', 'Enregistrer cette note', '保存这条笔记'],
  'Tap to open this note': ['Chạm để mở ghi chú', 'タップしてノートを開く', '눌러서 노트 열기', 'Touchez pour ouvrir la note', '点按打开笔记'],
  'Tap for options': ['Chạm để xem tuỳ chọn', 'タップでオプション', '눌러서 옵션 보기', 'Touchez pour les options', '点按查看选项'],
  'Rename': ['Đổi tên', '名前を変更', '이름 변경', 'Renommer', '重命名'],
  'New note inside': ['Ghi chú mới bên trong', '中に新規ノート', '안에 새 노트', "Nouvelle note à l'intérieur", '在其中新建笔记'],
  'Import into folder': ['Nhập vào thư mục', 'フォルダに読み込む', '폴더로 가져오기', 'Importer dans le dossier', '导入到文件夹'],
  'Sort items': ['Sắp xếp mục', '項目を並べ替え', '항목 정렬', 'Trier les éléments', '排序项目'],
  'Ungroup': ['Tách nhóm', 'グループ解除', '묶음 해제', 'Dégrouper', '取消编组'],
  'Move to…': ['Chuyển đến…', '移動…', '이동…', 'Déplacer vers…', '移到…'],
  'Add to Favourites': ['Thêm vào Yêu thích', 'お気に入りに追加', '즐겨찾기에 추가', 'Ajouter aux favoris', '添加到收藏'],
  'Remove from Favourites': ['Bỏ khỏi Yêu thích', 'お気に入りから削除', '즐겨찾기에서 제거', 'Retirer des favoris', '从收藏中移除'],
  'Add to Home Screen': ['Thêm vào Màn hình chính', 'ホーム画面に追加', '홈 화면에 추가', "Ajouter à l'écran d'accueil", '添加到主屏幕'],
  'Share folder…': ['Chia sẻ thư mục…', 'フォルダを共有…', '폴더 공유…', 'Partager le dossier…', '共享文件夹…'],
  'Share note…': ['Chia sẻ ghi chú…', 'ノートを共有…', '노트 공유…', 'Partager la note…', '共享笔记…'],
  'Share file…': ['Chia sẻ tệp…', 'ファイルを共有…', '파일 공유…', 'Partager le fichier…', '共享文件…'],
  'Get info': ['Thông tin', '情報を見る', '정보 보기', 'Informations', '显示简介'],
  'Delete folder': ['Xoá thư mục', 'フォルダを削除', '폴더 삭제', 'Supprimer le dossier', '删除文件夹'],
  'Delete folder and 1 item': ['Xoá thư mục và 1 mục', 'フォルダと1項目を削除', '폴더와 항목 1개 삭제', 'Supprimer le dossier et 1 élément', '删除文件夹和 1 个项目'],
  'Delete folder and {n} items': ['Xoá thư mục và {n} mục', 'フォルダと{n}項目を削除', '폴더와 항목 {n}개 삭제', 'Supprimer le dossier et {n} éléments', '删除文件夹和 {n} 个项目'],
  'Save…': ['Lưu…', '保存…', '저장…', 'Enregistrer…', '保存…'],
  'Save a copy…': ['Lưu bản sao…', 'コピーを保存…', '사본 저장…', 'Enregistrer une copie…', '存储副本…'],
  'Duplicate': ['Nhân bản', '複製', '복제', 'Dupliquer', '复制'],
  'Delete note': ['Xoá ghi chú', 'ノートを削除', '노트 삭제', 'Supprimer la note', '删除笔记'],
  'Delete file': ['Xoá tệp', 'ファイルを削除', '파일 삭제', 'Supprimer le fichier', '删除文件'],
  'Handwritten note': ['Ghi chú viết tay', '手書きノート', '손글씨 노트', 'Note manuscrite', '手写笔记'],
  'Folder': ['Thư mục', 'フォルダ', '폴더', 'Dossier', '文件夹'],
  'Image': ['Hình ảnh', '画像', '이미지', 'Image', '图片'],
  'Text file': ['Tệp văn bản', 'テキストファイル', '텍스트 파일', 'Fichier texte', '文本文件'],
  'Document': ['Tài liệu', '書類', '문서', 'Document', '文稿'],
  'Change file icons': ['Đổi biểu tượng tệp', 'ファイルのアイコンを変更', '파일 아이콘 변경', 'Changer les icônes', '更换文件图标'],
  'New folder': ['Thư mục mới', '新規フォルダ', '새 폴더', 'Nouveau dossier', '新建文件夹'],
  'Tidy up': ['Sắp gọn', '整頓', '정리', 'Ranger', '整理'],
  'Select files to group them into a folder, delete them or give them an emoji icon.': ['Chọn tệp để gộp vào thư mục, xoá, hoặc gắn biểu tượng emoji.', 'ファイルを選んで、フォルダにまとめたり、削除したり、絵文字アイコンを付けたりできます。', '파일을 선택해 폴더로 묶거나, 삭제하거나, 이모지 아이콘을 붙일 수 있어요.', 'Sélectionnez des fichiers pour les grouper, les supprimer ou leur donner une icône emoji.', '选择文件后可编组到文件夹、删除，或设置表情图标。'],
  'New note title': ['Tên ghi chú mới', '新しいノートの名前', '새 노트 이름', 'Titre de la note', '新笔记标题'],
  'Import a file': ['Nhập một tệp', 'ファイルを読み込む', '파일 가져오기', 'Importer un fichier', '导入文件'],
  'Open all files': ['Mở tất cả tệp', 'すべてのファイルを開く', '모든 파일 열기', 'Ouvrir tous les fichiers', '打开全部文件'],
  'Switch to light mode': ['Chuyển sang chế độ sáng', 'ライトモードにする', '라이트 모드로 전환', 'Passer en mode clair', '切换到浅色模式'],
  'Switch to dark mode': ['Chuyển sang chế độ tối', 'ダークモードにする', '다크 모드로 전환', 'Passer en mode sombre', '切换到深色模式'],
  'Pen': ['Bút mực', 'ペン', '펜', 'Stylo', '钢笔'],
  'Pencil': ['Bút chì', '鉛筆', '연필', 'Crayon', '铅笔'],
  'Highlighter': ['Bút dạ quang', '蛍光ペン', '형광펜', 'Surligneur', '荧光笔'],
  'Eraser': ['Tẩy', '消しゴム', '지우개', 'Gomme', '橡皮擦'],
  'Lasso': ['Khoanh chọn', '投げ縄', '올가미', 'Lasso', '套索'],
  'Undo': ['Hoàn tác', '取り消す', '실행 취소', 'Annuler', '撤销'],
  'Redo': ['Làm lại', 'やり直す', '다시 실행', 'Rétablir', '重做'],
  'Page style': ['Kiểu trang', 'ページのスタイル', '페이지 스타일', 'Style de page', '页面样式'],
  'Draw with finger': ['Vẽ bằng ngón tay', '指で描く', '손가락으로 그리기', 'Dessiner au doigt', '用手指绘图'],
  'Drag to move the toolbar': ['Kéo để di chuyển thanh công cụ', 'ドラッグでツールバーを移動', '드래그해서 도구 막대 이동', 'Glissez pour déplacer la barre', '拖移工具栏'],
  'Favourites': ['Yêu thích', 'お気に入り', '즐겨찾기', 'Favoris', '收藏'],
  'Toolbar': ['Thanh công cụ', 'ツールバー', '도구 막대', "Barre d'outils", '工具栏'],
  'Floating': ['Nổi', 'フローティング', '떠 있음', 'Flottante', '浮动'],
  'Move it anywhere on the page': ['Kéo đến bất kỳ đâu trên trang', '画面のどこへでも動かせます', '화면 어디로든 옮길 수 있어요', "Déplacez-la n'importe où", '可拖到页面任意位置'],
  'Fixed at top': ['Cố định ở trên', '上部に固定', '위에 고정', 'Fixée en haut', '固定在顶部'],
  'Stays at the top, always in reach': ['Luôn ở phía trên, dễ chạm tới', 'いつも上にあり、すぐ手が届きます', '항상 위에 있어 바로 쓸 수 있어요', 'Reste en haut, toujours à portée', '始终在顶部，随手可用'],
  'Close window': ['Đóng cửa sổ', 'ウインドウを閉じる', '창 닫기', 'Fermer la fenêtre', '关闭窗口'],
  'Tap to bring it to the front': ['Chạm để đưa lên trước', 'タップして前面に表示', '눌러서 앞으로 가져오기', 'Touchez pour la mettre devant', '点按移到前面'],
  'Recent files': ['Tệp gần đây', '最近のファイル', '최근 파일', 'Fichiers récents', '最近文件'],
  'Edited': ['Đã sửa', '編集', '편집됨', 'Modifiés', '已编辑'],
  'Added': ['Đã thêm', '追加', '추가됨', 'Ajoutés', '已添加'],
  'change': ['thay đổi', '件の変更', '변경', 'modification', '处更改'],
  'changes': ['thay đổi', '件の変更', '변경', 'modifications', '处更改'],
  'Nothing edited yet. Files you change show up here.': ['Chưa sửa tệp nào. Tệp bạn thay đổi sẽ hiện ở đây.', 'まだ編集したファイルはありません。変更したファイルがここに表示されます。', '아직 편집한 파일이 없습니다. 변경한 파일이 여기에 표시됩니다.', 'Rien de modifié pour l’instant. Les fichiers modifiés s’affichent ici.', '还没有编辑过的文件。你更改的文件会显示在这里。'],
  'Typeface': ['Kiểu chữ', '書体', '서체', 'Police', '字体'],
  'Imported': ['Đã nhập', '読み込み済み', '가져옴', 'Importée', '已导入'],
  'Import a font…': ['Nhập phông chữ…', 'フォントを読み込む…', '글꼴 가져오기…', 'Importer une police…', '导入字体…'],
  'Size': ['Cỡ chữ', 'サイズ', '크기', 'Taille', '字号'],
  'Text': ['Chữ', 'テキスト', '텍스트', 'Texte', '文字'],
  'Tap the page to type. Tap a piece of text to edit it. Imported fonts: TTF, OTF, WOFF or WOFF2.': ['Chạm vào trang để gõ. Chạm vào chữ để sửa. Phông nhập: TTF, OTF, WOFF hoặc WOFF2.', 'ページをタップして入力。文字をタップすると編集できます。読み込めるフォント: TTF、OTF、WOFF、WOFF2。', '페이지를 탭해 입력하세요. 텍스트를 탭하면 편집합니다. 가져올 수 있는 글꼴: TTF, OTF, WOFF, WOFF2.', 'Touchez la page pour écrire. Touchez un texte pour le modifier. Polices importées : TTF, OTF, WOFF ou WOFF2.', '点按页面输入文字，点按文字可编辑。可导入 TTF、OTF、WOFF 或 WOFF2 字体。'],
  'Font added': ['Đã thêm phông', 'フォントを追加しました', '글꼴 추가됨', 'Police ajoutée', '已添加字体'],
  'Light leaks, slow mornings': ['Vệt sáng, buổi sáng chậm', '光漏れ、ゆっくりな朝', '빛 번짐, 느린 아침', 'Fuites de lumière, matins lents', '漏光，慢悠悠的早晨'],
  'Recent': ['Gần đây', '最近', '최근', 'Récentes', '最近'],
  'All colours': ['Tất cả màu', 'すべての色', '모든 색', 'Toutes les couleurs', '全部颜色'],
  'Today': ['Hôm nay', '今日', '오늘', "Aujourd'hui", '今天'],
  'Kind': ['Loại', '種類', '종류', 'Type', '种类'],
  'Items': ['Số mục', '項目数', '항목', 'Éléments', '项目'],
  'Where': ['Vị trí', '場所', '위치', 'Emplacement', '位置'],
  'Created': ['Tạo lúc', '作成日', '만든 날짜', 'Créé', '创建时间'],
  'Info': ['Thông tin', '情報', '정보', 'Infos', '简介'],
  'Save as a new file': ['Lưu thành tệp mới', '新しいファイルとして保存', '새 파일로 저장', 'Enregistrer comme nouveau fichier', '存储为新文件'],
  'Save note': ['Lưu ghi chú', 'ノートを保存', '노트 저장', 'Enregistrer la note', '保存笔记'],
  'Save in': ['Lưu vào', '保存先', '저장 위치', 'Enregistrer dans', '存储到'],
  'On its own': ['Để riêng', '単独で', '따로 두기', 'Seul', '单独存放'],
  'Zoom in': ['Phóng to', '拡大', '확대', 'Agrandir', '放大'],
  'Zoom out': ['Thu nhỏ', '縮小', '축소', 'Réduire', '缩小'],
  'Split': ['Chia đôi', '分割', '분할', 'Diviser', '分屏'],
  'Split screen': ['Chia màn hình', '画面分割', '화면 분할', "Partage d'écran", '分屏'],
  '2 files': ['2 tệp', '2つのファイル', '파일 2개', '2 fichiers', '2 个文件'],
  '3 files': ['3 tệp', '3つのファイル', '파일 3개', '3 fichiers', '3 个文件'],
  '4 files': ['4 tệp', '4つのファイル', '파일 4개', '4 fichiers', '4 个文件'],
  'Side by side': ['Cạnh nhau', '左右に並べる', '나란히', 'Côte à côte', '左右并排'],
  'One large, two stacked': ['Một lớn, hai xếp chồng', '大1つと小2つ', '큰 창 하나, 작은 창 둘', 'Un grand, deux empilés', '一大两小'],
  'A grid of four': ['Lưới bốn ô', '4分割', '4칸 격자', 'Une grille de quatre', '四宫格'],
  'Close split screen': ['Đóng chia màn hình', '分割を終了', '분할 닫기', 'Fermer le partage', '关闭分屏'],
  'Back to one window': ['Trở về một cửa sổ', '1つのウインドウに戻す', '창 하나로 돌아가기', 'Revenir à une fenêtre', '回到单个窗口'],
  'Change file': ['Đổi tệp', 'ファイルを変更', '파일 변경', 'Changer', '更换文件'],
  'Choose a file': ['Chọn tệp', 'ファイルを選択', '파일 선택', 'Choisir un fichier', '选择文件'],
  'Tap to write here': ['Chạm để viết ở đây', 'タップしてここに書く', '눌러서 여기에 쓰기', 'Touchez pour écrire ici', '点按在此书写'],
  'One pane always holds a note': ['Luôn có một ô là ghi chú', '1つは必ずノートです', '한 칸은 항상 노트예요', 'Un panneau contient toujours une note', '至少一个窗格是笔记'],
  'Yesterday': ['Hôm qua', '昨日', '어제', 'Hier', '昨天'],
  'Preview': ['Xem trước', 'プレビュー', '미리 보기', 'Aperçu', '预览'],
  'Toolbar options': ['Tuỳ chọn thanh công cụ', 'ツールバーの設定', '도구 막대 옵션', "Options de la barre d'outils", '工具栏选项'],
};
let LANG = 'en';
try { const l = localStorage.getItem('olaa-lang'); if (LANGS.some(x => x[0] === l)) LANG = l; } catch (_) {}
const LCOL = { vi: 0, ja: 1, ko: 2, fr: 3, zh: 4 };
function t(k, v) {
  let out = LANG in LCOL && I18N[k] ? I18N[k][LCOL[LANG]] : k;
  if (v) for (const x in v) out = out.replace('{' + x + '}', v[x]);
  return out;
}
const langOf = c => LANGS.find(x => x[0] === c);
const fmtL = () => new Intl.DateTimeFormat(langOf(LANG)[3], { weekday: 'short', day: 'numeric', month: 'short' });
const todayEN = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date());
const SW = 720, SH = 520;
let PW = 720, PH = 520, CW = 0, CH = 0;
const vw = () => innerWidth, vh = () => innerHeight;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- spring easings for CSS / WAAPI ---------- */
const hasLinear = CSS.supports('transition-timing-function', 'linear(0, 1)');
function springEase(k, d, fallback) {
  let x = 0, v = 0, t = 0; const dt = 1 / 240, pts = [0];
  for (let i = 1; i < 2400; i++) {
    v += (-k * (x - 1) - d * v) * dt; x += v * dt; t += dt;
    if (i % 8 === 0) pts.push(+x.toFixed(4));
    if (Math.abs(x - 1) < .0015 && Math.abs(v) < .02) break;
  }
  pts.push(1);
  return { e: hasLinear ? `linear(${pts.join(',')})` : fallback, d: reduceMotion ? 1 : Math.round(t * 1000) };
}
const SPR = springEase(170, 17, 'cubic-bezier(.3,1.5,.5,1)');
const SPR_FAST = springEase(320, 26, 'cubic-bezier(.3,1.3,.5,1)');
const SPR_SOFT = springEase(150, 21, 'cubic-bezier(.2,1.1,.3,1)');
const SPR_OPEN = springEase(210, 23, 'cubic-bezier(.2,.95,.3,1)');   // file opening: barely overshoots
document.documentElement.style.setProperty('--spr-e', SPR_SOFT.e);
document.documentElement.style.setProperty('--spr-d', SPR_SOFT.d + 'ms');

/* ---------- physics bodies ---------- */
const active = new Set(); let raf = 0, lastT = 0, zTop = 30;
function wake(b) { active.add(b); if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); } }
function tick(now) {
  const dt = Math.min(.05, Math.max(.001, (now - lastT) / 1000)); lastT = now;
  const n = Math.ceil(dt / .008);
  for (const b of [...active]) {
    let busy = false;
    for (let i = 0; i < n; i++) busy = b.step(dt / n);
    b.render();
    if (!busy) active.delete(b);
  }
  resolveCollisions();
  raf = active.size ? requestAnimationFrame(tick) : 0;
}
/* files never overlap: touching tiles push each other apart with a little pop.
   A slow drag lets you hover over a file (to make a folder); a fast drag shoves files aside. */
const groups = new Set();
function resolveCollisions() {
  for (const g of groups) {
    if (g.container && !g.container.isConnected) { groups.delete(g); continue; }
    if (g.skip && g.skip()) continue;
    const bs = g.bodies();
    // fixed obstacles (the Files header): files slide off them, the obstacle never moves
    for (const o of (g.obstacles ? g.obstacles() : [])) for (const b of bs) {
      if (b.mode !== 'free') continue;            // only a file you just let go of can be nudged
      const ox = Math.min(b.x + 80, o.x + o.w) - Math.max(b.x, o.x), oy = Math.min(b.y + 96, o.y + o.h) - Math.max(b.y, o.y);
      if (ox <= 0 || oy <= 0) continue;
      const below = b.y + 48 > o.y + o.h / 2;
      if (oy < ox) b.vy += (below ? 1 : -1) * oy * 16; else b.vx += (b.x + 40 > o.x + o.w / 2 ? 1 : -1) * ox * 16;
      if (b.mode === 'rest') b.mode = 'free'; wake(b);
    }
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], b = bs[j];
      if (a.mode === 'spring' || b.mode === 'spring' || (a.mode !== 'free' && b.mode !== 'free')) continue;   // resting files never push each other
      const dx = b.x - a.x, dy = b.y - a.y, ox = 78 - Math.abs(dx), oy = 94 - Math.abs(dy);
      if (ox <= 4 || oy <= 4) continue;                       // a light touch is fine; only real overlap pops
      const aD = a.mode === 'drag', bD = b.mode === 'drag';
      if (aD || bD) continue;                                 // a file under your finger never shoves others
      const d = Math.hypot(dx, dy); let nx = dx / (d || 1), ny = dy / (d || 1);
      if (d < 1) { const t = Math.random() * 6.28; nx = Math.cos(t); ny = Math.sin(t); }
      const kv = (Math.min(ox, oy) - 4) * 7;
      for (const [body, sign, solo] of [[a, -1, bD || b.pinned], [b, 1, aD || a.pinned]]) {
        if (body.mode === 'drag' || body.pinned) continue;
        const f = solo ? 1 : .5;
        body.vx += sign * nx * kv * f; body.vy += sign * ny * kv * f;
        const sp = Math.hypot(body.vx, body.vy); if (sp > 520) { body.vx *= 520 / sp; body.vy *= 520 / sp; }
        if (body.mode === 'rest') body.mode = 'free';
        if (!body.bumped) {
          body.bumped = true; const l = body.el.querySelector('.lift');
          if (l && !reduceMotion) l.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04, .97)' }, { transform: 'scale(1)' }], { duration: 360, easing: 'cubic-bezier(.3,1.6,.5,1)' });
          setTimeout(() => body.bumped = false, 380);
        }
        wake(body);
      }
    }
  }
}
class Body {
  constructor(el, o = {}) {
    Object.assign(this, { el, x: o.x || 0, y: o.y || 0, s: o.s || 1, vx: 0, vy: 0, vs: 0, ts: null, tilt: 0,
      tiltK: o.tiltK ?? 1, mode: 'rest', bounds: o.bounds || null, onRender: o.onRender || null, samples: [], raise: o.raise ?? true });
    this.render();
  }
  render() {
    this.el.style.transform = `translate3d(${this.x.toFixed(2)}px,${this.y.toFixed(2)}px,0)` + (this.s !== 1 ? ` scale(${this.s.toFixed(4)})` : '');
    if (this.tiltK) this.el.style.setProperty('--tilt', this.tilt.toFixed(2) + 'deg');
    this.onRender && this.onRender(this);
  }
  place(x, y) { this.x = x; this.y = y; this.vx = this.vy = 0; this.mode = 'rest'; active.delete(this); this.render(); }
  grab() { this.mode = 'drag'; this.samples = []; this.el.classList.add('dragging'); if (this.raise) this.el.style.zIndex = ++zTop; wake(this); }
  dragTo(x, y, t) {
    if (this.bounds && this.mode === 'drag' && !this.noRubber) {      // past an edge the corner resists, like iPadOS windows
      const b = this.bounds(this), rb = (v, lo, hi) => { hi = Math.max(lo, hi); const d = v < lo ? lo - v : v > hi ? v - hi : 0; if (!d) return v; const e = d * .45 / (1 + d / 260); return v < lo ? lo - e : hi + e; };
      x = rb(x, b.minX, b.maxX); y = rb(y, b.minY, b.maxY);
    }
    const s = this.samples; s.push({ t, x, y });
    while (s.length > 2 && t - s[0].t > 90) s.shift();
    if (s.length > 1) { const a = s[s.length - 2], dt = Math.max(4, t - a.t); this.vx = this.vx * .55 + (x - a.x) / dt * 1000 * .45; this.vy = this.vy * .55 + (y - a.y) / dt * 1000 * .45; }
    this.x = x; this.y = y; this.render();
  }
  velocity(t) {
    const s = this.samples; if (s.length < 2) return { x: 0, y: 0 };
    const a = s[0], b = s[s.length - 1];
    if (t - b.t > 70) return { x: 0, y: 0 };
    const dt = Math.max(16, b.t - a.t) / 1000; let x = (b.x - a.x) / dt, y = (b.y - a.y) / dt; const m = Math.hypot(x, y);
    if (m > 3400) { x *= 3400 / m; y *= 3400 / m; }
    return { x, y };
  }
  release(vx = 0, vy = 0) { this.el.classList.remove('dragging'); this.vx = vx; this.vy = vy; this.mode = 'free'; wake(this); }
  springTo(x, y, s, k = 200, d = 24) { this.tx = x; this.ty = y; if (s != null) { this.ts = s; this.sk = k; this.sd = d; } this.k = k; this.d = d; this.mode = 'spring'; wake(this); }
  settle() { if (this.mode !== 'drag') { this.mode = 'free'; wake(this); } }
  step(dt) {
    let busy = false;
    if (this.mode === 'free') {
      const b = this.bounds && this.bounds(this);
      let still = true;
      for (const [p, v, lo, hi] of [['x', 'vx', 'minX', 'maxX'], ['y', 'vy', 'minY', 'maxY']]) {
        const c = b ? clamp(this[p], b[lo], Math.max(b[lo], b[hi])) : this[p];
        if (Math.abs(c - this[p]) > .4) { this[v] += (-(this[p] - c) * 190 - this[v] * 22) * dt; still = false; }
        else this[v] *= Math.pow(.004, dt);
        this[p] += this[v] * dt;
        if (Math.abs(this[v]) > 6) still = false;
      }
      if (still) { if (b) { this.x = clamp(this.x, b.minX, Math.max(b.minX, b.maxX)); this.y = clamp(this.y, b.minY, Math.max(b.minY, b.maxY)); } this.vx = this.vy = 0; this.mode = 'rest'; }
      else busy = true;
    } else if (this.mode === 'spring') {
      this.vx += (-this.k * (this.x - this.tx) - this.d * this.vx) * dt; this.vy += (-this.k * (this.y - this.ty) - this.d * this.vy) * dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (Math.hypot(this.x - this.tx, this.y - this.ty) < .3 && Math.hypot(this.vx, this.vy) < 4) { this.x = this.tx; this.y = this.ty; this.vx = this.vy = 0; this.mode = 'rest'; }
      else busy = true;
    } else if (this.mode === 'drag') { busy = true; this.vx *= Math.pow(.02, dt); this.vy *= Math.pow(.02, dt); }
    if (this.ts != null) {
      this.vs += (-(this.sk || 260) * (this.s - this.ts) - (this.sd || 28) * this.vs) * dt; this.s += this.vs * dt;
      if (Math.abs(this.s - this.ts) < .0006 && Math.abs(this.vs) < .003) { this.s = this.ts; this.ts = null; this.vs = 0; this.onScaleSettled && this.onScaleSettled(); }
      else busy = true;
    }
    if (this.tiltK) {
      const target = this.mode === 'rest' ? 0 : clamp(this.vx * .006, -7, 7) * this.tiltK;
      this.tilt += (target - this.tilt) * Math.min(1, dt * 11);
      if (Math.abs(this.tilt) > .02 || Math.abs(target) > .02) busy = true; else this.tilt = 0;
    }
    return busy;
  }
}
// iPadOS sometimes delivers pointerup to another element (capture lost, element moved or hidden, a system gesture).
// Every gesture registers how it ends; this one listener ends it whatever element the release lands on.
const pendingEnds = new Set();
for (const ty of ['pointerup', 'pointercancel']) addEventListener(ty, e => { for (const fn of [...pendingEnds]) fn(e); }, true);
let moving = 0;
const moveStart = () => { if (++moving === 1) document.body.classList.add('moving'); };
const moveEnd = () => { moving = Math.max(0, moving - 1); if (!moving) document.body.classList.remove('moving'); };
// whatever lands on the top bar slides clear of it (below it, or above if the bar sits low)
function pushOffTop(b) {
  if (!b || fullKey || !b.el.isConnected || b.mode === 'drag' || b.mode === 'spring' ||      // already heading somewhere
 b.el.closest('[hidden]') || b.el.closest('#panelPos .view, #rail')) return;
  const tb = $('#topWin').getBoundingClientRect(), inner = b.el.querySelector('.win') || b.el.querySelector('.tile') || b.el, r = inner.getBoundingClientRect();
  if (!r.width || r.left >= tb.right || r.right <= tb.left || r.top >= tb.bottom || r.bottom <= tb.top) return;
  const down = tb.top + tb.height / 2 < vh() / 2, dy = down ? tb.bottom + 12 - r.top : tb.top - 12 - r.bottom;
  b.springTo(b.x, b.y + dy, null, 210, 24);
}
function afterDrop(b) {
  if (W && b === W.today.body) { for (const o of [sheet, W.tools.body, viewer.open && viewer.body, ...ghosts.map(g => g.b), ...allFileBodies()]) pushOffTop(o); }
  else pushOffTop(b);
}
function draggable(body, handle, o = {}) {
  let id = null, sx, sy, px, py, moved = false, tgt = null, holdT = 0, held = false;
  handle.addEventListener('pointerdown', e => {
    if (id !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target.closest('button, input:not([readonly]), .lights')) return;      // a read-only title is part of the bar you grab
    if (o.accept && !o.accept(e)) return;
    e.stopPropagation();
    id = e.pointerId; tgt = e.target; try { handle.setPointerCapture(id); } catch (_) {}
    pendingEnds.add(end); moveStart();
    sx = body.x; sy = body.y; px = e.clientX; py = e.clientY; moved = false;
    body.rebase = (x, y, cx, cy) => { sx = x; sy = y; px = cx; py = cy; };
    body.grab(); body.samples.push({ t: e.timeStamp, x: sx, y: sy }); o.down && o.down(e);
    held = false; clearTimeout(holdT); if (o.hold) holdT = setTimeout(() => { if (!moved && id !== null) { held = true; o.hold(e); } }, 500);
  });
  handle.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    const dx = e.clientX - px, dy = e.clientY - py;
    if (!moved && Math.hypot(dx, dy) > (held ? 12 : 6)) { moved = true; clearTimeout(holdT); if (held) { held = false; o.holdCancel && o.holdCancel(); } o.moveStart && o.moveStart(); }
    if (moved) { const k = o.scale ? o.scale() : 1; body.dragTo(sx + dx / k, sy + dy / k, e.timeStamp); o.move && o.move(e); }
  });
  const end = e => {
    if (e.pointerId !== id) return; id = null; pendingEnds.delete(end); moveEnd(); o.up && o.up(e);
    if (moved) setTimeout(() => afterDrop(body), 380);
    clearTimeout(holdT);
    if (!moved) { body.el.classList.remove('dragging'); body.vx = body.vy = 0; body.mode = 'rest'; wake(body); if (held) { held = false; return; } if (e.type === 'pointerup') o.tap && o.tap(e, tgt); return; }
    const v = body.velocity(e.timeStamp);
    if (o.end && o.end(e, v) === false) { body.el.classList.remove('dragging'); return; }
    body.release(v.x, v.y);
  };
  handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
  handle.addEventListener('lostpointercapture', e => { if (e.pointerId === id) end({ pointerId: id, type: 'pointercancel', timeStamp: e.timeStamp, clientX: px, clientY: py, target: handle }); });
}
document.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const g = e.target.closest && e.target.closest('.glass'); if (!g) return;
  const r = g.getBoundingClientRect();
  g.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
  g.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
}, { passive: true });

function slidePill(pill, btn, instant) {
  const l = btn.offsetLeft, r = l + btn.offsetWidth;
  const cur = parseFloat(getComputedStyle(pill).getPropertyValue('--l')) || l;
  const right = l > cur;
  pill.style.transition = instant || reduceMotion ? 'none' :
    (right ? `--r ${SPR_FAST.d}ms ${SPR_FAST.e}, --l ${SPR.d}ms ${SPR.e} 40ms, opacity .3s` : `--l ${SPR_FAST.d}ms ${SPR_FAST.e}, --r ${SPR.d}ms ${SPR.e} 40ms, opacity .3s`);
  pill.style.setProperty('--l', l + 'px'); pill.style.setProperty('--r', r + 'px');
}
// FLIP a window's glass shell from where it was to where it ends up
function morph(inner, mutate, opts = {}) {
  const a = inner.getBoundingClientRect();
  mutate();
  const b = inner.getBoundingClientRect();
  if (reduceMotion || !b.width || !b.height) return;
  const ps = opts.parentScale || 1;
  inner.animate([
    { transform: `translate(${(a.left - b.left) / ps}px,${(a.top - b.top) / ps}px) scale(${a.width / b.width},${a.height / b.height})` },
    { transform: 'none' }], { duration: (opts.spr || SPR_OPEN).d, easing: (opts.spr || SPR_OPEN).e });
  for (const c of inner.children) if (!c.classList.contains('lights')) c.animate([{ opacity: 0 }, { opacity: 0, offset: .2 }, { opacity: 1 }], { duration: 360, easing: 'cubic-bezier(.2,.8,.2,1)' });
}

/* ---------- day mood (Apple emoji images) ---------- */
// t = which of the 8 base moods it behaves like (background palette + app suggestions)
const TONES = [
  ['#f6d9a0', '#f3bba6', '#f7e8c6', '#d8e6cf'], ['#f3e2b3', '#cfe3d6', '#f2c9b8', '#dcd6ea'], ['#bdd5cf', '#c8d2e6', '#d7e4d3', '#a9c3bf'], ['#cfe3d6', '#e4dcef', '#f3e6cf', '#bcd8ca'],
  ['#dcd6ea', '#c9cfe6', '#efdfe6', '#d1dae8'], ['#f4bea5', '#f6d59b', '#f0a99b', '#f3e2c4'], ['#e1e5e9', '#d9d3ea', '#cfe3d6', '#eee5d5'], ['#b8c3dc', '#cabfdb', '#a8b8ce', '#dfd2c2']];
const MOODS = [
  ['2600-fe0f', 'Sunny', 0], ['1f324-fe0f', 'Bright', 1], ['1f327-fe0f', 'Rainy', 2], ['1f60c', 'Calm', 3], ['1f971', 'Sleepy', 4], ['1f525', 'Fired up', 5], ['1f4ad', 'Thoughtful', 6], ['1f319', 'Late night', 7],
  // feelings
  ['1f60a', 'Happy', 1], ['1f642', 'Fine', 3], ['1f604', 'Cheerful', 0], ['1f970', 'Loved', 0], ['1f60d', 'Smitten', 5], ['1f929', 'Excited', 5], ['1f60e', 'Confident', 0], ['1f973', 'Celebrating', 5],
  ['1f607', 'Grateful', 3], ['1f979', 'Touched', 3], ['1f914', 'Curious', 6], ['1f610', 'Flat', 6], ['1fae0', 'Melting', 4], ['1f62e-200d-1f4a8', 'Relieved', 3], ['1f614', 'Down', 2], ['1f622', 'Sad', 2],
  ['1f62d', 'Crying', 2], ['1f624', 'Frustrated', 5], ['1f621', 'Angry', 5], ['1f92f', 'Overwhelmed', 6], ['1f634', 'Tired', 4], ['1f62a', 'Drowsy', 4], ['1f912', 'Unwell', 4], ['1f637', 'Sick', 4],
  // weather & seasons
  ['26c5', 'Cloudy', 1], ['2601-fe0f', 'Grey', 2], ['26c8-fe0f', 'Stormy', 2], ['1f308', 'Rainbow', 1], ['2744-fe0f', 'Cold', 2], ['1f338', 'Spring', 3], ['1f342', 'Autumn', 0], ['1f30a', 'Wavy', 2], ['1f33f', 'Fresh', 3],
  // the day
  ['2615', 'Coffee', 0], ['1f4da', 'Studying', 6], ['1f3a7', 'Music', 3], ['1f4f7', 'Shooting film', 1], ['1f3c3', 'Active', 5], ['1f9d8', 'Mindful', 3], ['1f389', 'Party', 5], ['1f4aa', 'Strong', 5],
  ['2764-fe0f', 'Love', 0], ['2728', 'Sparkly', 1], ['1f4a1', 'Inspired', 6], ['1f35c', 'Comfort food', 7],
].map(([u, n, t]) => ({ u, n, t, c: TONES[t] }));
MOODS.push(...[
  ["1f600", "Grinning", 0],
  ["1f601", "Beaming", 0],
  ["1f602", "Laughing", 5],
  ["1f923", "Rolling with laughter", 5],
  ["1f605", "Phew", 1],
  ["1f606", "Giggly", 0],
  ["1f609", "Playful", 1],
  ["1f60b", "Yum", 0],
  ["1f61c", "Silly", 5],
  ["1f92a", "Goofy", 5],
  ["1f917", "Huggy", 3],
  ["1f92d", "Giggling", 1],
  ["1f92b", "Quiet", 6],
  ["1f928", "Doubtful", 6],
  ["1f611", "Blank", 6],
  ["1f644", "Eye roll", 6],
  ["1f60f", "Smug", 5],
  ["1f612", "Unimpressed", 2],
  ["1f62c", "Awkward", 6],
  ["1f615", "Confused", 6],
  ["1f61f", "Worried", 2],
  ["1f641", "A bit sad", 2],
  ["1f62e", "Surprised", 1],
  ["1f632", "Amazed", 1],
  ["1f633", "Embarrassed", 5],
  ["1f97a", "Pleading", 3],
  ["1f628", "Scared", 2],
  ["1f630", "Anxious", 2],
  ["1f625", "Disappointed", 2],
  ["1f613", "Stressed", 2],
  ["1f629", "Weary", 4],
  ["1f62b", "Exhausted", 4],
  ["1f924", "Hungry", 0],
  ["1f922", "Queasy", 4],
  ["1f927", "Sneezy", 2],
  ["1f975", "Too hot", 5],
  ["1f976", "Freezing", 2],
  ["1f974", "Woozy", 4],
  ["1f635", "Dizzy", 4],
  ["1f913", "Nerdy", 6],
  ["1f9d0", "Focused", 6],
  ["1f636", "Speechless", 6],
  ["1f978", "Incognito", 7],
  ["1fae1", "Ready", 0],
  ["1fae3", "Shy", 3],
  ["1fae2", "Gasp", 1],
  ["1fae4", "Meh", 6],
  ["1f972", "Bittersweet", 3],
  ["1f9e1", "Warm heart", 0],
  ["1f49b", "Sunny heart", 0],
  ["1f49a", "Green heart", 3],
  ["1f499", "Blue heart", 2],
  ["1f49c", "Purple heart", 7],
  ["1f90e", "Brown heart", 0],
  ["1f5a4", "Black heart", 7],
  ["1f90d", "White heart", 3],
  ["1fa77", "Pink heart", 3],
  ["1fa75", "Light blue heart", 2],
  ["1f494", "Heartbroken", 2],
  ["1f495", "Two hearts", 3],
  ["1f496", "Sparkling heart", 1],
  ["1f49d", "Gift of love", 5],
  ["1f31e", "Sun face", 0],
  ["2b50", "Star", 1],
  ["1f31f", "Shining", 1],
  ["26a1", "Electric", 5],
  ["1f32a-fe0f", "Tornado", 2],
  ["1f32b-fe0f", "Foggy", 2],
  ["1f321-fe0f", "Feverish", 5],
  ["2603-fe0f", "Snowy", 2],
  ["1f343", "Breezy", 3],
  ["1f341", "Maple", 0],
  ["1f33b", "Sunflower", 0],
  ["1f337", "Tulip", 3],
  ["1f339", "Rose", 5],
  ["1f335", "Prickly", 0],
  ["1f340", "Lucky", 3],
  ["1f344", "Forest", 6],
  ["1f3d4-fe0f", "Mountains", 2],
  ["1f3d6-fe0f", "Beach day", 0],
  ["1f305", "Sunrise", 0],
  ["1f307", "Sunset", 0],
  ["1f303", "City night", 7],
  ["1f30c", "Stargazing", 7],
  ["1f315", "Full moon", 7],
  ["1f431", "Cat", 3],
  ["1f436", "Dog", 0],
  ["1f430", "Bunny", 3],
  ["1f43c", "Panda", 3],
  ["1f98a", "Fox", 0],
  ["1f427", "Penguin", 2],
  ["1f425", "Chick", 1],
  ["1f98b", "Butterfly", 1],
  ["1f41d", "Busy bee", 5],
  ["1f422", "Slow day", 4],
  ["1f375", "Tea", 3],
  ["1f9cb", "Bubble tea", 1],
  ["1f370", "Cake", 5],
  ["1f369", "Donut", 0],
  ["1f34e", "Apple", 3],
  ["1f353", "Strawberry", 5],
  ["1f951", "Avocado", 3],
  ["1f355", "Pizza", 5],
  ["1f35d", "Pasta", 0],
  ["1f363", "Sushi", 3],
  ["1f957", "Salad", 3],
  ["1f964", "Iced drink", 1],
  ["1f377", "Wine", 7],
  ["1f37a", "Beer", 7],
  ["1f3a8", "Creative", 6],
  ["1f3ac", "Movie night", 7],
  ["1f3ae", "Gaming", 5],
  ["1f3b8", "Guitar", 0],
  ["1f3a4", "Karaoke", 5],
  ["1f3b5", "Humming", 1],
  ["26bd", "Football", 5],
  ["1f3c0", "Basketball", 5],
  ["1f6b4", "Cycling", 1],
  ["1f3ca", "Swimming", 2],
  ["1f6b6", "Walking", 3],
  ["1f3cb-fe0f", "Lifting", 5],
  ["2708-fe0f", "Travelling", 1],
  ["1f686", "Train ride", 2],
  ["1f6b2", "Bike ride", 1],
  ["1f697", "Driving", 0],
  ["1f3e0", "At home", 3],
  ["1f3eb", "School", 6],
  ["1f3e2", "Work", 6],
  ["26fa", "Camping", 0],
  ["1f3a1", "Day out", 1],
  ["1f5fa-fe0f", "Exploring", 1],
  ["1f4bb", "Laptop", 6],
  ["1f4f1", "Phone", 6],
  ["1f4dd", "Writing", 6],
  ["270f-fe0f", "Sketching", 6],
  ["1f4d6", "Reading", 3],
  ["1f4c5", "Busy day", 5],
  ["23f0", "Early start", 0],
  ["1f381", "Gift", 5],
  ["1f388", "Balloon", 1],
  ["1f56f-fe0f", "Candlelight", 7],
  ["1f6cf-fe0f", "Bedtime", 4],
  ["1f6c1", "Bath", 3],
  ["1f9f9", "Cleaning", 1],
  ["1f48a", "Medicine", 4],
  ["1f4fc", "Retro", 7],
  ["1f39e-fe0f", "Film", 7],
  ["1f4f8", "Snapshot", 1],
  ["2705", "Done", 3],
  ["274c", "Nope", 5],
  ["2757", "Important", 5],
  ["2753", "Unsure", 6],
  ["1f4af", "Perfect", 5],
  ["1f4a4", "Zzz", 4],
  ["1f4ac", "Chatty", 1],
  ["1f4ab", "Dazed", 4],
  ["1f3c6", "Winning", 5],
  ["1f947", "First place", 5],
  ["1f3af", "On target", 5]
].map(([u, n, t]) => ({ u, n, t, c: TONES[t] })));
// common feelings: [emoji, name, a line for the day, words people type for it, family]
const EMOTIONS = [
  ['1f60a', 'Happy', 'Have a nice day!', 'good glad nice great fine', 'bright'],
  ['1f604', 'Cheerful', 'Go chase the good light.', 'joy joyful bright sunny', 'bright'],
  ['1f602', 'Laughing', 'Keep that laugh close.', 'funny lol haha', 'bright'],
  ['1f970', 'Loved', 'You are cared for.', 'love warm cared', 'bright'],
  ['1f60d', 'In love', 'Write this day down.', 'crush adore romance', 'bright'],
  ['1f973', 'Celebrating', 'Well done. Enjoy it.', 'party win birthday proud', 'bright'],
  ['1f929', 'Excited', 'Aim it at one good thing.', 'thrilled pumped hyped', 'bright'],
  ['1f60e', 'Confident', 'You’ve got this.', 'proud cool strong', 'bright'],
  ['1f607', 'Grateful', 'Name one small thank-you.', 'thankful blessed lucky', 'bright'],
  ['1f979', 'Touched', 'Let it sink in.', 'moved hopeful emotional', 'calm'],
  ['1f60c', 'Calm', 'Slow is fine today.', 'peaceful relaxed chill', 'calm'],
  ['1f642', 'Content', 'An okay day is a good day.', 'okay fine alright', 'calm'],
  ['1f62e-200d-1f4a8', 'Relieved', 'That’s behind you now.', 'phew relief finally', 'calm'],
  ['1f61c', 'Playful', 'Make something for fun.', 'silly goofy fun', 'bright'],
  ['1f914', 'Curious', 'Follow the question.', 'wonder thinking interested', 'calm'],
  ['1f9d0', 'Focused', 'One thing at a time.', 'busy work study productive', 'calm'],
  ['1f610', 'Meh', 'Small steps still count.', 'bored flat neutral blah', 'low'],
  ['1f644', 'Annoyed', 'Let it pass you by.', 'irritated bothered', 'tense'],
  ['1f615', 'Confused', 'Not knowing yet is okay.', 'lost unsure puzzled', 'tense'],
  ['1f633', 'Embarrassed', 'Nobody’s keeping score.', 'awkward ashamed', 'tense'],
  ['1f62e', 'Surprised', 'Well, that was new.', 'shocked wow amazed', 'bright'],
  ['1fae3', 'Shy', 'Quiet is allowed.', 'nervous timid', 'calm'],
  ['1f634', 'Tired', 'Rest is part of the work.', 'sleep sleepy rest', 'tired'],
  ['1f971', 'Sleepy', 'Do the smallest thing first.', 'yawn drowsy tired', 'tired'],
  ['1f62b', 'Exhausted', 'You’ve done enough today.', 'drained burnt out worn tired', 'tired'],
  ['1fae0', 'Melting', 'Step away for ten minutes.', 'hot overwhelmed done', 'tired'],
  ['1f622', 'Sad', 'This feeling will pass.', 'unhappy blue upset', 'low'],
  ['1f614', 'Down', 'Be kind to yourself today.', 'low gloomy unmotivated', 'low'],
  ['1f62d', 'Crying', 'You don’t have to be okay.', 'cry upset tears', 'low'],
  ['1f97a', 'Lonely', 'Reach out to one person.', 'alone miss missing', 'low'],
  ['1f494', 'Heartbroken', 'Go easy on yourself.', 'breakup hurt grief', 'low'],
  ['1f972', 'Bittersweet', 'Both can be true today.', 'nostalgic mixed', 'calm'],
  ['1f61f', 'Worried', 'Write the worry down.', 'concerned uneasy', 'tense'],
  ['1f630', 'Anxious', 'Breathe in four, out six.', 'nervous panic anxiety', 'tense'],
  ['1f628', 'Scared', 'Brave can feel like this.', 'afraid fear', 'tense'],
  ['1f613', 'Stressed', 'Do just the first task.', 'pressure deadline busy', 'tense'],
  ['1f92f', 'Overwhelmed', 'Pick one thing only.', 'too much swamped', 'tense'],
  ['1f624', 'Frustrated', 'Take a short walk.', 'stuck annoyed', 'tense'],
  ['1f621', 'Angry', 'Let it cool first.', 'mad furious rage', 'tense'],
  ['1f912', 'Unwell', 'Rest and drink water.', 'sick ill fever', 'tired'],
  ['1f525', 'Fired up', 'Start with the hard part.', 'motivated energy driven', 'bright'],
];
const EMO = EMOTIONS.map(([u, n, q, kw, fam]) => { const i = MOODS.findIndex(m => m.u === u); if (i < 0) return -1; Object.assign(MOODS[i], { n, q, kw: (n + ' ' + kw).toLowerCase(), fam }); return i; }).filter(i => i >= 0);
for (let i = EMO.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [EMO[i], EMO[j]] = [EMO[j], EMO[i]]; }   // no fixed order
const FAMS = [['all', 'All', '2728'], ['bright', 'Bright', '1f60a'], ['calm', 'Calm', '1f60c'], ['low', 'Low', '1f614'], ['tense', 'Tense', '1f630'], ['tired', 'Tired', '1f634']];
// emoji: bundled Apple images when present, otherwise the device's own emoji font (Apple Color Emoji on iPad and Mac)
const emoChar = u => String.fromCodePoint(...u.split('-').map(h => parseInt(h, 16)));
const emoImg = (u, px = 16, cls = 'emo', label = '', extra = '') => EMOJI[u]
  ? `<img class="${cls}" src="${EMOJI[u]}" width="${px}" height="${px}" alt="${esc(label)}" draggable="false"${extra}>`
  : `<span class="${cls} emo-t" style="font-size:${Math.round(px * .86)}px;width:${px}px;height:${px}px" role="img" aria-label="${esc(label)}">${emoChar(u)}</span>`;
const emoU = (u, px = 16) => emoImg(u, px);
const emo = (i, px = 16) => emoImg(MOODS[i].u, px, 'emo', MOODS[i].n);
const APPS = {
  lang: { name: 'Olaa Language', tip: 'English practice', sug: [
    'Good energy. Try 15 minutes of speaking practice.', 'Learn 10 new words while the day is light.', 'Stay in with a podcast episode and its transcript.',
    'A slow reading session suits today.', 'Keep it light: a 5-minute flashcard review.', 'Take on the weekly challenge.',
    'Write a short journal entry in English.', 'One short review, then sleep.'] },
  habit: { name: 'Olaa Habits', tip: 'Habit tracking', sug: [
    'A good day for your outdoor habits.', 'Tick off your morning routine first.', 'Indoor habits first: stretch, then read.',
    'Keep the streak alive with something small.', 'Do the smallest habit on your list.', 'Go for the hardest habit today.',
    'Look back at this week’s streaks.', 'Log today’s habits before bed.'] },
};
const field = $('#field'), moodsEl = $('#moods'), moodPill = $('#moodPill');
let recents = [0, 1, 2, 3, 4, 5, 6, 7];
try { const r = JSON.parse(localStorage.getItem('olaa-recent-moods') || 'null'); if (Array.isArray(r)) { const ok = r.filter(n => MOODS[n]); if (ok.length) recents = ok.slice(0, 8); } } catch (_) {}
function renderQuick() {
  moodsEl.querySelectorAll('.mood').forEach(b => b.remove());
  recents.forEach(i => {
    const m = MOODS[i], b = document.createElement('button'); b.className = 'mood'; b.dataset.i = i; b.innerHTML = emo(i, 26);
    b.setAttribute('aria-label', m.n); b.setAttribute('aria-pressed', String(current && current.mood === i)); b.title = m.n;
    b.addEventListener('click', () => { setMood(i, true); setTimeout(() => toggleMoodRow(false), 380); });
    moodsEl.append(b);
  });
  const more = document.createElement('button'); more.className = 'mood more'; more.setAttribute('aria-label', 'All emoji'); more.title = 'All emoji';
  more.innerHTML = '<svg class="i" viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/></svg>';
  more.addEventListener('click', () => openEmojiPop()); moodsEl.append(more);
}
function useRecent(i) { recents = [i, ...recents.filter(x => x !== i)].slice(0, 8); try { localStorage.setItem('olaa-recent-moods', JSON.stringify(recents)); } catch (_) {} renderQuick(); }
const moodBtn = $('#moodBtn');
function syncMoodBtn() {
  const m = current && current.mood;
  $('#moodFace').innerHTML = m == null ? '<i class="ph"></i>' : emo(m, 28);
}
function toggleMoodRow(open) {
  const was = !moodsEl.hidden; if (open === undefined) open = !was; if (open === was) return;
  closeEmojiPop();
  const wasCentered = Math.abs(W.today.body.x - (vw() - $('#topWin').offsetWidth * W.today.body.s) / 2) < 8 || !!fullKey;
  morph($('#topWin'), () => {
    moodsEl.hidden = !open; moodBtn.setAttribute('aria-expanded', String(open)); $('#topbar').classList.toggle('picking', open);
    if (wasCentered && fullKey !== 'today') centerTop(false);
  }, { spr: SPR_OPEN });
  if (open) {
    if (current.mood != null && moodsEl.querySelector(`[data-i="${current.mood}"]`)) { slidePill(moodPill, moodsEl.querySelector(`[data-i="${current.mood}"]`), true); moodPill.classList.add('on'); } else moodPill.classList.remove('on');
    moodsEl.querySelectorAll('.mood').forEach((b, i) => b.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { duration: SPR.d, easing: SPR.e, delay: i * 22, fill: 'backwards' }));
  }
}
moodBtn.addEventListener('click', () => emojiOpen ? closeEmojiPop() : openEmojiPop());
moodBtn.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEmojiPop(); } });
// full emoji picker
const emojiPop = $('#emojiPop'); let emojiOpen = false;
const emoBtn = i => `<button data-i="${i}" aria-label="${esc(MOODS[i].n)}" title="${esc(MOODS[i].n)}">${emo(i, 28)}</button>`;
const CAT_TONE = { 'Smileys & People': 1, 'Animals & Nature': 3, 'Food & Drink': 0, 'Activity': 5, 'Travel & Places': 1, 'Objects': 6, 'Symbols': 6, 'Flags': 1 };
const CAT_ICON = [['Feelings', '1f60a'], ['Smileys & People', '1f604'], ['Animals & Nature', '1f431'], ['Food & Drink', '1f35c'], ['Activity', '26bd'], ['Travel & Places', '2708-fe0f'], ['Objects', '1f4a1'], ['Symbols', '2764-fe0f'], ['Flags', null]];
let pickerBuilt = false, allEmoji = null, allLoading = null;
const nameOf = {}, catOf = {};
function quoteOf(i) { return i == null ? '' : (MOODS[i].q || MOODS[i].n); }
function setPreview(i) {
  $('#ePrevE').innerHTML = i == null ? '<i class="ph"></i>' : emo(i, 36);
  $('#ePrevN').textContent = i == null ? "How's today?" : MOODS[i].n;
  $('#ePrevQ').textContent = i == null ? 'Pick a feeling, or any emoji.' : quoteOf(i);
}
function previewCode(u) { $('#ePrevE').innerHTML = emoU(u, 36); $('#ePrevN').textContent = nameOf[u] || ''; $('#ePrevQ').textContent = catOf[u] || ''; }
function moodIndexFor(u) {        // any emoji can be today's: it borrows colours from its category
  let i = MOODS.findIndex(m => m.u === u); if (i >= 0) return i;
  const t = CAT_TONE[catOf[u]] ?? 3; MOODS.push({ u, n: nameOf[u] || 'Emoji', t, c: TONES[t] }); return MOODS.length - 1;
}
function suggestions() {
  const h = new Date().getHours();
  const byTime = h < 11 ? ['1f60a', '1f971', '1f60c', '1f929', '1f9d0'] : h < 17 ? ['1f9d0', '1f642', '1f634', '1f914', '1f613'] : h < 22 ? ['1f60c', '1f607', '1f634', '1f60a', '1f62b'] : ['1f971', '1f634', '1f972', '1f60c', '1f97a'];
  const ids = [...recents.slice(0, 2), ...byTime.map(u => MOODS.findIndex(m => m.u === u))];
  return [...new Set(ids)].filter(i => i >= 0 && MOODS[i]).slice(0, 6);
}
function loadAllEmoji() {
  if (allEmoji || allLoading) return allLoading;
  allLoading = fetch('data/emoji-all.json').then(r => r.json()).then(d => {
    if (d.img) for (const k in d.img) if (!EMOJI[k]) EMOJI[k] = 'data:image/webp;base64,' + d.img[k];
    d.cats.forEach(([c, rows]) => rows.forEach(([u, n, kw]) => { nameOf[u] = n; catOf[u] = c; }));
    allEmoji = d; return d;
  }).catch(() => { allLoading = null; const n = $('#eLoad'); if (n) n.textContent = 'Couldn’t load the full emoji set. Try again in a moment.'; });
  return allLoading;
}
function fillCategory(sec) {
  if (sec.dataset.done || !allEmoji) return; sec.dataset.done = '1';
  const rows = allEmoji.cats.find(c => c[0] === sec.dataset.g)[1];
  sec.querySelector('.egrid').innerHTML = rows.map(([u, n]) => `<button data-u="${u}" title="${esc(n)}" aria-label="${esc(n)}">${emoImg(u, 28, 'emo', '', ' loading="lazy" decoding="async"')}</button>`).join('');
  sec.querySelector('.egrid').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260 });
}
let io = null;
function buildPicker() {
  emojiPop.innerHTML = `<div class="ehd"><span class="eprev" id="ePrevE"></span><div class="eprevt"><b id="ePrevN"></b><small id="ePrevQ"></small></div><button class="ghost" id="eReset">Standard icon</button></div>
    <input class="esearch" id="eSearch" type="search" placeholder="Type how you feel, or search all emoji" aria-label="Search emoji" autocomplete="off">
    <div class="escroll" id="eScroll">
      <section data-g="Results" hidden><h5>Results</h5><div class="egrid" id="eRes"></div><p class="enone" hidden>No emoji match that word.</p></section>
      <section data-g="Feelings"><h5 id="eSugT">Suggested for you</h5><div class="egrid" id="eSug"></div><h5>Feelings</h5><div class="egrid" id="eAll">${EMO.map(emoBtn).join('')}</div></section>
      ${CAT_ICON.slice(1).map(([g]) => `<section data-g="${g}" class="ecat"><h5>${g}</h5><div class="egrid"><p class="eload" id="${g === 'Smileys & People' ? 'eLoad' : ''}">Loading…</p></div></section>`).join('')}
    </div>
    <div class="etabs" id="eFam">${CAT_ICON.map(([g, u]) => `<button data-f="${g}" title="${g}" aria-label="${g}">${u ? emoU(u, 22) : '<svg class="i" viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>'}</button>`).join('')}</div>`;
  emojiPop.addEventListener('click', e => {
    const b = e.target.closest('.egrid button');
    if (b && pickFor) { const u = b.dataset.u || MOODS[+b.dataset.i].u, list = pickFor; closeEmojiPop(); return setIcons(list, u); }
    if (b) { const i = b.dataset.u ? moodIndexFor(b.dataset.u) : +b.dataset.i; useRecent(i); setMood(i, true); setPreview(i); markPressed(); setTimeout(closeEmojiPop, 380); return; }
    if (e.target.closest('#eReset')) { const list = pickFor; closeEmojiPop(); return setIcons(list, null); }
    const t = e.target.closest('.etabs button');
    if (t) { const sec = emojiPop.querySelector(`section[data-g="${t.dataset.f}"]`); if ($('#eSearch').value) { $('#eSearch').value = ''; filterPicker(); }
      loadAllEmoji(); $('#eScroll').scrollTo({ top: sec.offsetTop - 4, behavior: reduceMotion ? 'auto' : 'smooth' }); markTab(t.dataset.f); }
  });
  const sc = $('#eScroll');
  sc.addEventListener('pointerover', e => { const b = e.target.closest('.egrid button'); if (!b || e.pointerType !== 'mouse') return; b.dataset.u ? previewCode(b.dataset.u) : setPreview(+b.dataset.i); });
  sc.addEventListener('pointerleave', () => { if (!pickFor) setPreview(current.mood); });
  sc.addEventListener('scroll', () => { const secs = [...emojiPop.querySelectorAll('section:not([hidden])')]; const top = sc.scrollTop + 30; let cur = secs[0]; secs.forEach(x => { if (x.offsetTop <= top) cur = x; }); if (cur) markTab(cur.dataset.g); }, { passive: true });
  io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { loadAllEmoji().then(() => fillCategory(en.target)); } }), { root: sc, rootMargin: '300px' });
  emojiPop.querySelectorAll('section.ecat').forEach(x => io.observe(x));
  $('#eSearch').addEventListener('input', filterPicker);
  pickerBuilt = true;
}
function markTab(g) { $('#eFam').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === g))); }
function markPressed() { emojiPop.querySelectorAll('.egrid button[data-i]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.i === current.mood))); }
function filterPicker() {
  const q = $('#eSearch').value.trim().toLowerCase(), words = q.split(/\s+/).filter(Boolean), res = emojiPop.querySelector('section[data-g="Results"]');
  emojiPop.querySelectorAll('section:not([data-g="Results"])').forEach(x => x.hidden = !!words.length);
  res.hidden = !words.length;
  $('#eSug').innerHTML = suggestions().map(emoBtn).join('');
  if (!words.length) { setPreview(current.mood); markPressed(); return; }
  // auto-suggest: feelings first, then every emoji whose name matches
  const feel = EMO.filter(i => words.every(w => MOODS[i].kw.includes(w)));
  const more = [];
  if (allEmoji) for (const [, rows] of allEmoji.cats) for (const [u, n, kw] of rows) { const hay = (n + ' ' + kw).toLowerCase(); if (words.every(w => hay.includes(w)) && !feel.some(i => MOODS[i].u === u)) more.push([u, n]); if (more.length > 80) break; }
  else loadAllEmoji().then(() => { if ($('#eSearch').value.trim()) filterPicker(); });
  $('#eRes').innerHTML = feel.map(emoBtn).join('') + more.map(([u, n]) => `<button data-u="${u}" title="${esc(n)}" aria-label="${esc(n)}">${emoU(u, 28)}</button>`).join('');
  res.querySelector('.enone').hidden = !!(feel.length || more.length);
  if (feel.length) setPreview(feel[0]); else if (more.length) previewCode(more[0][0]);
}
let pickFor = null;
function setIcons(list, u) {
  (list || []).forEach(f => { if (u) f.icon = u; else delete f.icon; refreshTile(f); if (f.kind === 'folder') refreshFolder(f); });
  if (railOn) enterRail();
  toast(u ? `New icon for ${list.length === 1 ? `“${list[0].name}”` : list.length + ' files'}` : 'Back to the standard icon');
  if (selecting) endSelect();
}
function openEmojiPop(opts = {}) {
  closePop(); if (!pickerBuilt) buildPicker();
  pickFor = opts.targets || null; emojiPop.classList.toggle('iconmode', !!pickFor);
  $('#eSearch').value = ''; filterPicker(); setPreview(current.mood); markTab('Feelings');
  emojiPop.hidden = false; emojiOpen = true; $('#eScroll').scrollTop = 0;
  if (pickFor) { $('#ePrevE').innerHTML = pickFor[0].icon ? emoU(pickFor[0].icon, 36) : '<i class="ph"></i>'; $('#ePrevN').textContent = 'Choose an icon'; $('#ePrevQ').textContent = pickFor.length === 1 ? `For “${pickFor[0].name}”` : `For ${pickFor.length} files`; }
  const r = (opts.anchor || moodBtn).getBoundingClientRect(), w = emojiPop.offsetWidth, h = emojiPop.offsetHeight;
  const below = r.bottom + 12 + h < vh() - 8 || r.top < vh() / 2;
  emojiPop.style.left = clamp(r.left + r.width / 2 - w / 2, 10, vw() - w - 10) + 'px'; emojiPop.style.top = clamp(below ? r.bottom + 12 : r.top - h - 12, 8, vh() - h - 8) + 'px';
  emojiPop.style.transformOrigin = `${r.left + r.width / 2 - parseFloat(emojiPop.style.left)}px 0px`;
  emojiPop.animate([{ opacity: 0, transform: 'scale(.9) translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: SPR_OPEN.d, easing: SPR_OPEN.e });
  setTimeout(loadAllEmoji, 400);
}
function closeEmojiPop() {
  if (!emojiOpen) return; emojiOpen = false; pickFor = null;
  emojiPop.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.95)' }], { duration: 160 }).onfinish = () => { if (!emojiOpen) emojiPop.hidden = true; };
}
document.addEventListener('pointerdown', e => {
  if (emojiOpen && !e.target.closest('#emojiPop, #moodBtn')) closeEmojiPop();
  else if (!moodsEl.hidden && !emojiOpen && !e.target.closest('#topbar')) toggleMoodRow(false);
});
function applyPalette(c) { ['--b1', '--b2', '--b3', '--b4'].forEach((k, j) => field.style.setProperty(k, c[j])); }
function setMood(i, user) {
  if (user && current.mood === i) i = null;
  current.mood = i;
  [...moodsEl.querySelectorAll('.mood[data-i]')].forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.i === i)));
  syncMoodBtn();
  if (user && i != null && !moodsEl.querySelector(`[data-i="${i}"]`)) useRecent(i);
  $('#moodName').textContent = i == null ? t("How's today?") : quoteOf(i); $('#moodName').title = i == null ? '' : `${MOODS[i].n}. ${quoteOf(i)}`;
  if (i == null) { moodPill.classList.remove('on'); applyPalette(MOODS[1].c); }
  else {
    const target = moodsEl.querySelector(`[data-i="${i}"]`);
    if (target && !moodsEl.hidden) { slidePill(moodPill, target, !moodPill.classList.contains('on')); moodPill.classList.add('on'); }
    applyPalette(MOODS[i].c);
    if (user && !reduceMotion) ripple(target && !moodsEl.hidden ? target : moodBtn, MOODS[i].c[0]);
    if (user) moodBtn.animate([{ transform: 'scale(.6) rotate(-12deg)' }, { transform: 'none' }], { duration: SPR.d, easing: SPR.e });
  }
  updateMeta(); renderToday(); if (popApp) renderPop(popApp);
}
function ripple(el, color) {
  const r = el.getBoundingClientRect(); const d = document.createElement('div'); d.className = 'ripple';
  d.style.left = r.left + r.width / 2 + 'px'; d.style.top = r.top + r.height / 2 + 'px';
  d.style.background = `radial-gradient(closest-side, ${color}, transparent)`;
  document.body.append(d);
  const scale = Math.hypot(vw(), vh()) / 14;
  d.animate([{ transform: 'scale(.2)', opacity: .9 }, { transform: `scale(${scale})`, opacity: 0 }], { duration: 1400, easing: 'cubic-bezier(.2,.7,.2,1)' }).onfinish = () => d.remove();
}
const fmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const todayStr = fmt.format(new Date());
$('#today').textContent = fmtL().format(new Date());

/* ---------- app shortcuts (integrations come later) ---------- */
const appPop = $('#appPop'); let popApp = null;
function renderPop(key) {
  const a = APPS[key], m = current.mood, btn = $(`#topbar .app[data-app="${key}"]`);
  appPop.innerHTML = `<div class="hd"><span class="app app-${key === 'lang' ? 'lang' : 'habit'}">${btn.innerHTML}</span><div><b>${a.name}</b><small>${a.tip}</small></div></div>
    <p>${m == null ? 'Pick today’s mood and you’ll get a suggestion that fits it.' : `${emo(m, 18)} ${esc(MOODS[m].n)} today. ${esc(a.sug[MOODS[m].t])}`}</p>
    ${key === 'habit' ? `<div class="st"><b>${habitsFor(todayKey).size} of ${HABITS.length}</b> habits done today. Tick them off in the Today view (tap the date).</div>` : ''}
    <div class="st">Not connected yet. The link to the app comes in a later build.</div>
    <button class="cta" id="popOpen">Open ${a.name}</button>`;
  $('#popOpen').addEventListener('click', () => { toast(`${a.name} isn’t connected yet`); closePop(); });
}
function openPop(key, btn) {
  if (popApp === key) return closePop();
  popApp = key; renderPop(key); appPop.hidden = false;
  const r = btn.getBoundingClientRect(), w = appPop.offsetWidth;
  appPop.style.left = clamp(r.left + r.width / 2 - w / 2, 12, vw() - w - 12) + 'px'; appPop.style.top = r.bottom + 14 + 'px';
  appPop.animate([{ opacity: 0, transform: 'translateY(-10px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: SPR.d, easing: SPR.e });
}
function closePop() {
  if (!popApp) return; popApp = null;
  appPop.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-6px) scale(.96)' }], { duration: 180 }).onfinish = () => { if (!popApp) appPop.hidden = true; };
}
document.querySelectorAll('#topbar .app').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openPop(b.dataset.app, b); }));
document.addEventListener('pointerdown', e => { if (popApp && !e.target.closest('#appPop, #topbar .app')) closePop(); });

/* ---------- Today (full-screen view of the top window) ---------- */
/* ---------- Today: calendar, habits checklist and notes for any day ---------- */
const dkey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const TODAY = new Date(), todayKey = dkey(TODAY);
const hashKey = k => [...k].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
const daysAgo = k => { const [y, m, d] = k.split('-').map(Number); return Math.round((new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate()) - new Date(y, m - 1, d)) / 864e5); };
const HABITS = [['water', 'Drink water', '1f964'], ['read', 'Read 10 pages', '1f4da'], ['photo', 'Take one photo', '1f4f7'], ['move', 'Move for 20 minutes', '1f4aa'], ['english', '10 minutes of English', '1f3a7', 'lang'], ['quiet', 'Five quiet minutes', '1f9d8']];
const EVENTS = [['07:00', 'Market shoot, Đà Lạt'], ['09:30', 'Film lab pickup'], ['10:00', 'Camera repair shop'], ['14:00', 'Study group'], ['15:30', 'Coffee with Linh'], ['18:30', 'English class'], ['19:30', 'Darkroom session']];
const habitLog = {}, touched = new Set(), dayMood = {};
try { const o = JSON.parse(localStorage.getItem('olaa-habits') || '{}'); for (const k in o) { if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !Array.isArray(o[k])) continue; habitLog[k] = new Set(o[k].filter(id => HABITS.some(h => h[0] === id))); touched.add(k); } } catch (_) {}   // only well-formed days and known habits are read back
function saveHabits() { try { const o = {}; touched.forEach(k => { o[k] = [...habitLog[k]]; }); localStorage.setItem('olaa-habits', JSON.stringify(o)); } catch (_) {} }
function habitsFor(k) {
  if (!habitLog[k]) { const ago = daysAgo(k); if (ago > 0 && ago <= 60) { const r = rng(hashKey(k)); habitLog[k] = new Set(HABITS.filter(() => r() < .6).map(h => h[0])); } else habitLog[k] = new Set(); }
  return habitLog[k];
}
const notesOn = k => [...walk(root)].filter(f => f.kind === 'note' && f.added && dkey(new Date(f.added)) === k);
function moodFor(k) {
  if (k === todayKey) return current.mood == null ? null : current.mood;
  if (k in dayMood) return dayMood[k];
  const n = notesOn(k).find(f => f.mood != null); if (n) return dayMood[k] = n.mood;
  const ago = daysAgo(k); if (ago > 0 && ago <= 60) { const r = rng(hashKey(k) + 3); return dayMood[k] = r() < .85 ? EMO[Math.floor(r() * EMO.length)] : null; }
  return dayMood[k] = null;
}
function eventsFor(k) {
  const r = rng(hashKey(k) + 11), n = Math.floor(r() * 3), out = new Map();
  for (let i = 0; i < n; i++) { const e = EVENTS[Math.floor(r() * EVENTS.length)]; out.set(e[1], e); }
  return [...out.values()].sort((a, b) => a[0].localeCompare(b[0]));
}
function streak() { let n = 0, d = new Date(TODAY); if (habitsFor(todayKey).size < 3) d.setDate(d.getDate() - 1); for (;;) { if (habitsFor(dkey(d)).size >= 3) { n++; d.setDate(d.getDate() - 1); } else return n; } }
const ringSvg = p => `<svg class="ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="14"/><circle cx="18" cy="18" r="14" style="stroke-dasharray:${(p * 87.96).toFixed(1)} 88"/></svg>`;
let calMonth = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1), selKey = todayKey;
function renderCal() {
  const grid = $('#calGrid'); if (!grid || !$('#topbar').classList.contains('full')) return;
  $('#calTitle').textContent = calMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const first = (calMonth.getDay() + 6) % 7, n = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
  let h = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => `<span class="wd">${d}</span>`).join('') + '<span></span>'.repeat(first);
  for (let d = 1; d <= n; d++) {
    const k = dkey(new Date(calMonth.getFullYear(), calMonth.getMonth(), d)), fut = k > todayKey;
    const m = fut ? null : moodFor(k), hb = fut ? 0 : habitsFor(k).size / HABITS.length, nd = !fut && notesOn(k).length;
    h += `<button class="cd${k === todayKey ? ' today' : ''}${k === selKey ? ' sel' : ''}" data-k="${k}" ${fut ? 'disabled' : ''} aria-label="${k}"><b>${d}</b>${m != null ? emo(m, 20) : '<i class="e0"></i>'}<span class="hb"><span style="width:${Math.round(hb * 100)}%"></span></span>${nd ? '<span class="nd"></span>' : ''}</button>`;
  }
  grid.innerHTML = h;
  $('#calNext').disabled = calMonth.getFullYear() === TODAY.getFullYear() && calMonth.getMonth() === TODAY.getMonth();
}
function renderDay() {
  const v = $('#dayView'); if (!v || !$('#topbar').classList.contains('full')) return;
  const [y, mo, d] = selKey.split('-').map(Number), date = new Date(y, mo - 1, d), isToday = selKey === todayKey, ago = daysAgo(selKey);
  const m = moodFor(selKey), done = habitsFor(selKey), ev = eventsFor(selKey), notes = notesOn(selKey);
  v.innerHTML = `<header class="dvhd"><div><b>${date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</b><small>${isToday ? 'Today' : ago === 1 ? 'Yesterday' : ago + ' days ago'}</small></div></header>
    <button class="dvmood" ${isToday ? '' : 'disabled'}>${m != null ? emo(m, 36) : '<i class="e0 big"></i>'}<span><b>${m != null ? esc(MOODS[m].n) : isToday ? 'How’s today?' : 'No feeling saved'}</b><small>${m != null ? esc(quoteOf(m)) : isToday ? 'Tap to pick a feeling.' : ''}</small></span></button>
    <section class="card"><h3><svg class="i" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>Calendar<small>Apple Calendar · sample events</small></h3>
      ${ev.length ? `<ul class="evs">${ev.map(([t, n]) => `<li><time>${t}</time><span>${esc(n)}</span></li>`).join('')}</ul>` : '<p class="note-s">Nothing on the calendar.</p>'}</section>
    <section class="card habits"><h3><span class="app app-habit sm"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.2" stroke-opacity=".38"/><path d="M12 4.8a7.2 7.2 0 1 1-6.85 4.97"/></svg></span>Habits<small>${done.size} of ${HABITS.length} done${ago > 0 && !touched.has(selKey) ? ' · sample' : ''}</small>${ringSvg(done.size / HABITS.length)}</h3>
      <div class="hlist">${HABITS.map(([id, n, e, from]) => `<button class="hab${done.has(id) ? ' on' : ''}" data-h="${id}" aria-pressed="${done.has(id)}"><span class="ck"><svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9"/></svg></span>${emoU(e, 20)}<span class="hn">${esc(n)}</span>${from === 'lang' ? '<span class="from"><span class="app app-lang xs"><span class="gl">Aa</span></span>Language</span>' : ''}</button>`).join('')}</div>
      <p class="note-s">Streak: ${streak()} day${streak() === 1 ? '' : 's'} with at least half done.</p></section>
    <section class="card"><h3>Notes<small>${notes.length || 'none'}</small></h3>${notes.length ? `<div class="chips">${notes.map(f => `<button class="chip" data-id="${f.id}">${f.mood != null ? emo(f.mood, 16) : ''}${esc(f.name)}<small>${f.strokes.length} stroke${f.strokes.length === 1 ? '' : 's'}</small></button>`).join('')}</div>` : '<p class="note-s">No notes this day.</p>'}</section>
    <section class="card"><h3><span class="app app-lang sm"><span class="gl">Aa</span></span>Olaa Language</h3><p class="tip">${m != null ? esc(APPS.lang.sug[MOODS[m].t]) : 'Pick a feeling for a suggestion.'}</p></section>`;
}
function renderToday() { renderCal(); renderDay(); }
$('#calGrid').addEventListener('click', e => { const b = e.target.closest('.cd'); if (!b || b.disabled) return; selKey = b.dataset.k; renderToday(); $('#dayView').animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' }); });
function slideCal(dir) { $('#calGrid').animate([{ opacity: 0, transform: `translateX(${dir * 22}px)` }, { opacity: 1, transform: 'none' }], { duration: 340, easing: 'cubic-bezier(.32,.72,0,1)' }); }
$('#calPrev').addEventListener('click', () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); renderCal(); slideCal(-1); });
$('#calNext').addEventListener('click', () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); renderCal(); slideCal(1); });
$('#dayView').addEventListener('click', e => {
  const h = e.target.closest('.hab');
  if (h) { const set = habitsFor(selKey), id = h.dataset.h; set.has(id) ? set.delete(id) : set.add(id); touched.add(selKey); saveHabits(); renderToday();
    const nb = $(`#dayView .hab[data-h="${id}"] .ck`); if (nb) nb.animate([{ transform: 'scale(.6)' }, { transform: 'scale(1.15)' }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.3,1.6,.5,1)' }); return; }
  if (e.target.closest('.dvmood')) return openEmojiPop();
  const c = e.target.closest('.chip'); if (c) { const f = [...walk(root)].find(x => x.id === c.dataset.id); exitFull(); setTimeout(() => loadNote(f), 220); }
});

/* ---------- ink colours ---------- */
const INKS = ['graphite', 'fuji', 'kodak', 'ochre', 'sky'];
const INK_NAMES = { graphite: 'Graphite', fuji: 'Fuji green', kodak: 'Kodak red', ochre: 'Ochre', sky: 'Faded blue' };
const PALETTE = ['#1c1c1e', '#5e6266', '#a5a8ab', '#6b3a1f', '#a8572a', '#e0402a', '#ff6f4f', '#ff9e8a',
  '#ffa600', '#f5cf00', '#ffe27a', '#6fb500', '#0f8a5f', '#2ec27e', '#00a5a8', '#8fe3c4',
  '#1446a0', '#2f6fd6', '#6aa6ff', '#7a4dd8', '#b48cff', '#d6338a', '#ff8fc1', '#ffffff'];
let recentColors = [];
try { const a = JSON.parse(localStorage.getItem('olaa-recent-colors') || '[]'); if (Array.isArray(a)) recentColors = a.filter(c => typeof c === 'string' && (/^#[0-9a-f]{6}$/i.test(c) || INKS.includes(c))).slice(0, 8); } catch (_) {}
function rememberColor(c) { recentColors = [c, ...recentColors.filter(x => x !== c)].slice(0, 8); try { localStorage.setItem('olaa-recent-colors', JSON.stringify(recentColors)); } catch (_) {} }
let colorCache = {};
const themeColor = n => colorCache[n] || (colorCache[n] = getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888');
const inkColor = n => n && n[0] === '#' ? n : themeColor('--ink-' + n);
const colorName = n => n && n[0] === '#' ? n.toUpperCase() : INK_NAMES[n];
// pencil grain: a tinted noise tile used as the stroke pattern
const grainTiles = {};
function pencilPattern(ctx, col) {
  let t = grainTiles[col];
  if (!t) {
    t = document.createElement('canvas'); t.width = t.height = 48; const g = t.getContext('2d'), r = rng(77);
    g.fillStyle = col;
    for (let i = 0; i < 950; i++) { g.globalAlpha = .22 + r() * .78; g.fillRect(r() * 48, r() * 48, .6 + r() * 1.1, .6 + r() * 1.1); }
    grainTiles[col] = t;
  }
  return ctx.createPattern(t, 'repeat');
}

/* ---------- text ---------- */
// built-in typefaces use fonts the device already has; imported ones are added with FontFace and kept on this device
const FONTS = [
  { id: 'inter', name: 'Inter', css: '"Inter", system-ui, sans-serif' },
  { id: 'serif', name: 'Serif', css: 'ui-serif, "New York", Georgia, "Times New Roman", serif' },
  { id: 'rounded', name: 'Rounded', css: 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Nunito", system-ui, sans-serif' },
  { id: 'mono', name: 'Mono', css: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' },
  { id: 'hand', name: 'Handwritten', css: '"Noteworthy", "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive' },
  { id: 'marker', name: 'Marker', css: '"Marker Felt", "Chalkboard SE", "Segoe Print", fantasy' },
];
const fontCss = id => (FONTS.find(f => f.id === id) || FONTS[0]).css;
const TEXT_LH = 1.3, measureCtx = document.createElement('canvas').getContext('2d');
function drawText(ctx, s) {
  ctx.save(); ctx.fillStyle = inkColor(s.color); ctx.font = `${s.size}px ${fontCss(s.font)}`; ctx.textBaseline = 'top';
  const x = s.pts[0].x, y = s.pts[0].y;
  s.text.split('\n').forEach((l, i) => ctx.fillText(l, x, y + i * s.size * TEXT_LH + s.size * .1));
  ctx.restore();
}
// a text block's points zigzag across its box, so the eraser, lasso and thumbnails treat it like any other stroke
function textPts(x, y, w, h, size) {
  const rows = Math.max(2, Math.ceil(h / (size * .5)) + 1), pts = [];
  for (let i = 0; i < rows; i++) { const yy = y + h * i / (rows - 1), a = { x, y: yy, p: 1 }, b = { x: x + w, y: yy, p: 1 }; i % 2 ? pts.push(b, a) : pts.push(a, b); }
  return pts;
}
function textBox(text, size, font) {
  measureCtx.font = `${size}px ${fontCss(font)}`; const lines = text.split('\n');
  return { w: Math.max(8, ...lines.map(l => measureCtx.measureText(l).width)), h: lines.length * size * TEXT_LH };
}

/* ---------- stroke rendering ---------- */
// pen types: fountain (pressure + nib angle), ballpoint (even line), brush (strong pressure, tapered ends)
function widthFn(s, n) {
  const base = s.size, pr = s.pr !== false;
  if (s.tool === 'pencil') return p => base * (pr ? .45 + p * .9 : .9);
  if (s.type === 'ball') return p => base * (pr ? .82 + p * .32 : 1);
  if (s.type === 'brush') return (p, i) => { const tp = Math.max(0, Math.min(1, i / 7, (n - 1 - i) / 7)); return base * (pr ? .12 + p * 2.1 : 1.3) * (.25 + .75 * Math.pow(tp, .6)); };
  return (p, i, a, b) => { const ang = Math.atan2(b.y - a.y, b.x - a.x); return base * (pr ? .3 + p * 1.1 : .8) * (.72 + .5 * Math.abs(Math.sin(ang - Math.PI / 4))); };
}
function tracePath(ctx, pts, closed) {
  const n = pts.length; ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  if (n === 1) ctx.lineTo(pts[0].x + .01, pts[0].y);
  for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
  if (n > 1) ctx.lineTo(pts[n - 1].x, pts[n - 1].y);
  if (closed) ctx.closePath();
}
function drawStroke(ctx, s, extra) {
  if (s.tool === 'text') return drawText(ctx, s);
  const pts = extra && extra.length ? s.pts.concat(extra) : s.pts; const n = pts.length; if (!n) return;
  const col = inkColor(s.color);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.fillStyle = col;
  if (s.tool === 'hl') {
    ctx.globalAlpha *= s.op || .3; ctx.lineWidth = s.size; if (s.flat) ctx.lineCap = 'butt';
    tracePath(ctx, pts); ctx.stroke(); ctx.restore(); return;
  }
  if (s.tool === 'pencil') { ctx.strokeStyle = ctx.fillStyle = pencilPattern(ctx, col); }
  if (s.tool === 'shape' || s.shaped) {
    ctx.lineWidth = s.size * (s.tool === 'shape' ? 1 : .95); tracePath(ctx, pts, s.closed);
    if (s.closed && s.fill) { ctx.save(); ctx.globalAlpha *= .16; ctx.fillStyle = col; ctx.fill(); ctx.restore(); }
    ctx.stroke(); ctx.restore(); return;
  }
  const w = widthFn(s, n);
  if (n === 1) { ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, w(pts[0].p, 3, pts[0], pts[0]) / 2, 0, 7); ctx.fill(); ctx.restore(); return; }
  let px = pts[0].x, py = pts[0].y;
  for (let i = 1; i < n; i++) {
    const a = pts[i], last = i === n - 1;
    const mx = last ? a.x : (a.x + pts[i + 1].x) / 2, my = last ? a.y : (a.y + pts[i + 1].y) / 2;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(a.x, a.y, mx, my);
    ctx.lineWidth = w((pts[i - 1].p + a.p) / 2, i, pts[Math.max(0, i - 3)], pts[Math.min(n - 1, i + 2)]); ctx.stroke(); px = mx; py = my;
  }
  ctx.restore();
}
function drawLaser(ctx, pts, color, alpha) {
  if (!pts.length) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = ctx.lineJoin = 'round';
  ctx.strokeStyle = inkColor(color); ctx.shadowColor = inkColor(color); ctx.shadowBlur = 14; ctx.lineWidth = 5; tracePath(ctx, pts); ctx.stroke();
  ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
}
function extent(strokes) { let w = SW, h = SH; for (const s of strokes) { const b = bbox(s); w = Math.max(w, b[2] + 24); h = Math.max(h, b[3] + 24); } return { w, h }; }
function paintStrokes(canvas, strokes, cssW, cssH) {
  const k = 2; canvas.width = Math.round(cssW * k); canvas.height = Math.round(cssH * k);
  const e = extent(strokes), ctx = canvas.getContext('2d'); const sc = Math.min(cssW / e.w, cssH / e.h) * k; ctx.setTransform(sc, 0, 0, sc, 0, 0);
  for (const s of strokes) drawStroke(ctx, s);
}

/* ---------- sample content ---------- */
function handwriting(seed, { x0 = 56, y0 = 120, lines = 5, gap = 46, size = 13, maxX = 640, color = 'graphite', pen = 2.2, words } = {}) {
  const r = rng(seed), out = [];
  for (let L = 0; L < lines; L++) {
    let x = x0 + (L === 0 ? 0 : r() * 8); const base = y0 + L * gap + (r() - .5) * 3;
    const end = maxX - (L === lines - 1 ? 180 + r() * 160 : r() * 60); let wc = 0;
    while (x < end && (!words || wc < words)) {
      const len = clamp(28 + r() * 70, 20, end - x); if (len < 18) break;
      const pts = [], cw = size * .72, ph0 = r() * 6; const hs = [];
      for (let t = 0; t <= len; t += 1.1) {
        const li = Math.floor(t / cw); if (hs[li] == null) hs[li] = size * (r() < .22 ? 1.55 : (.62 + r() * .3));
        const ph = t / cw * Math.PI * 2; const h = hs[li] * (.5 - .5 * Math.cos(ph));
        const y = base - h + Math.sin(t * .03 + ph0) * 1.2; const xx = x + t - size * .17 * Math.sin(ph) + (base - y) * .22;
        pts.push({ x: +xx.toFixed(1), y: +y.toFixed(1), p: +(.5 + .18 * Math.sin(t * .09 + ph0)).toFixed(2) });
      }
      out.push({ tool: 'pen', color, size: pen, pts }); x += len + 12 + r() * 10; wc++;
    }
  }
  return out;
}
function lineStroke(x1, y1, x2, y2, color, size, tool = 'pen', wob = 1.2, seed = 3) {
  const r = rng(seed), pts = [], n = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 3);
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t + Math.sin(t * 6 + r()) * wob, p: .45 + Math.sin(t * Math.PI) * .25 }); }
  return { tool, color, size, pts };
}
function loopStroke(cx, cy, rx, ry, color, size, seed = 5) {
  const r = rng(seed), pts = [];
  for (let a = -.4; a < Math.PI * 2.15; a += .06) pts.push({ x: cx + Math.cos(a) * rx * (1 + (r() - .5) * .04), y: cy + Math.sin(a) * ry * (1 + (r() - .5) * .04), p: .55 });
  return { tool: 'pen', color, size, pts };
}
const noteC41 = () => [...handwriting(11, { y0: 100, lines: 1, size: 19, pen: 2.8, maxX: 420, color: 'fuji', words: 3 }), lineStroke(56, 112, 330, 115, 'fuji', 2.2, 'pen', 1.5, 2),
  ...handwriting(12, { y0: 170, lines: 6, gap: 44 }), loopStroke(560, 214, 70, 26, 'kodak', 2), lineStroke(60, 300, 400, 300, 'ochre', 16, 'hl', .6, 4)];
const noteGrain = () => [...handwriting(21, { y0: 100, lines: 1, size: 19, pen: 2.8, maxX: 400, color: 'sky', words: 3 }), ...handwriting(22, { y0: 168, lines: 3, gap: 44 }),
  lineStroke(70, 330, 640, 330, 'graphite', 2, 'pen', .8, 7), lineStroke(70, 330, 70, 440, 'graphite', 2, 'pen', .5, 8),
  ...[[110, 420], [210, 400], [320, 380], [440, 352], [560, 345]].map(([x, y], i) => loopStroke(x, y, 6, 6, 'kodak', 2.4, 30 + i)),
  ...handwriting(23, { y0: 470, x0: 90, lines: 1, size: 11, maxX: 400, words: 4 })];
function noteGroceries() {
  const s = [...handwriting(31, { y0: 96, lines: 1, size: 19, pen: 2.8, maxX: 360, words: 2 })];
  for (let i = 0; i < 6; i++) {
    s.push(loopStroke(76, 158 + i * 46 - 6, 7, 7, 'graphite', 1.8, 40 + i));
    s.push(...handwriting(50 + i, { x0: 100, y0: 158 + i * 46, lines: 1, maxX: 420, words: 2 }));
    if (i < 3) s.push(lineStroke(96, 152 + i * 46, 300, 150 + i * 46, 'kodak', 2, 'pen', 1, 60 + i));
  }
  return s;
}
const noteItinerary = () => [...handwriting(71, { y0: 96, lines: 1, size: 19, pen: 2.8, maxX: 380, color: 'ochre', words: 2 }), ...handwriting(72, { y0: 160, lines: 7, gap: 42, maxX: 560 }),
  lineStroke(600, 170, 640, 400, 'sky', 2.4, 'pen', 4, 5)];
function photo(seed, pal, w = 360, h = 270) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const r = rng(seed);
  const sky = x.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, pal[0]); sky.addColorStop(.7, pal[1]); x.fillStyle = sky; x.fillRect(0, 0, w, h);
  const sx = w * (.25 + r() * .5), sy = h * (.25 + r() * .2); const sun = x.createRadialGradient(sx, sy, 0, sx, sy, h * .45);
  sun.addColorStop(0, pal[2]); sun.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = sun; x.fillRect(0, 0, w, h);
  for (let L = 0; L < 3; L++) {
    x.fillStyle = pal[3 + L]; x.beginPath(); x.moveTo(0, h); const by = h * (.55 + L * .13), a = 10 + r() * 22, f = .006 + r() * .012, o = r() * 9;
    for (let i = 0; i <= w; i += 4) x.lineTo(i, by + Math.sin(i * f + o) * a + Math.sin(i * f * 3.1 + o) * a * .3);
    x.lineTo(w, h); x.fill();
  }
  const id = x.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const g = (r() - .5) * 26; d[i] += g; d[i + 1] += g; d[i + 2] += g; }
  x.putImageData(id, 0, 0);
  const v = x.createRadialGradient(w / 2, h / 2, h * .3, w / 2, h / 2, h * .85); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,30,20,.32)');
  x.fillStyle = v; x.fillRect(0, 0, w, h);
  return c.toDataURL('image/jpeg', .82);
}

let uid = 0; const nid = () => 'f' + (++uid);
const mk = {
  note: (name, strokes = [], date = todayStr, mood = null, paper = 'grid') => ({ id: nid(), kind: 'note', name, strokes, date, mood, paper, undo: [], redo: [] }),
  folder: (name, children) => ({ id: nid(), kind: 'folder', name, children }),
  image: (name, src) => ({ id: nid(), kind: 'image', name, src }),
  text: (name, body) => ({ id: nid(), kind: 'text', name, body }),
  doc: (name, ext, size) => ({ id: nid(), kind: 'doc', name, ext, size }),
};
let current = Object.assign(mk.note('Untitled'), { draft: true });
const root = [
  current,
  mk.folder('Film chemistry', [
    mk.note('C-41 process', noteC41(), 'Tue 12 Nov', 6, 'lines'),
    mk.note('Grain & ISO', noteGrain(), 'Thu 14 Nov', 3, 'grid'),
    mk.image('Contact sheet', photo(7, ['#cbd9d6', '#efe3c9', '#fff3d6', '#8fae9f', '#6f8c7f', '#4f6a60'])),
    mk.text('reading-list.txt', 'Reading list\n\n1. Developer temperature: why C-41 is run at 37.8 °C\n2. Bleach vs. fix: what each bath removes\n3. Push processing and what it does to grain\n4. Expired stock: add one stop per decade\n\nAsk Linh for her notes from week 3.'),
    mk.folder('Old exams', [mk.text('quiz-2025.txt', 'Quiz, week 5\n\nQ1. Name the four C-41 steps in order.\nQ2. Why does colour negative film have an orange mask?\nQ3. What changes when you push Portra 400 to 800?')]),
  ]),
  mk.folder('Đà Lạt trip', [
    mk.image('Pine hill', photo(21, ['#c9d7dc', '#e9e0cc', '#fff6e0', '#a7bba3', '#7f9a83', '#5c765f'])),
    mk.image('Morning fog', photo(33, ['#dfe3e4', '#ece8e1', '#ffffff', '#c3cdc8', '#a9b7b1', '#8a9a94'])),
    mk.note('Itinerary', noteItinerary(), 'Sat 2 Nov', 0),
  ]),
  mk.image('Xuân Hương lake', photo(45, ['#f1d6c2', '#f4e3c4', '#fff0d0', '#d3a38c', '#a9826f', '#6e5b52'])),
  mk.note('Groceries', noteGroceries(), 'Mon 18 Nov', 1, 'lines'),
  mk.doc('Portra 400 datasheet', 'PDF', '1.4 MB'),
  mk.text('ideas.txt', 'Things to try this week\n\n- Shoot one roll at golden hour, Đà Lạt market\n- Scan at 3000 dpi and compare with lab scans\n- Write up the C-41 notes as a clean page\n- Find a cheap point-and-shoot for Minh'),
];
function* walk(list) { for (const f of list) { yield f; if (f.children) yield* walk(f.children); } }
// when each file was added (for Sort by date). Sample notes use their own date; other samples are a few days old.
(() => {
  const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }, now = Date.now(); let k = 0;
  for (const f of walk(root)) {
    const m = f.kind === 'note' && /(\d{1,2}) (\w{3})/.exec(f.date);
    f.added = m ? new Date(new Date().getFullYear(), MON[m[2]], +m[1], 12).getTime() : f === current ? now : now - (3 + (k++ % 9)) * 864e5;
  }
  let j = 0;
  for (const f of walk(root)) if (f !== current && (f.kind === 'note' || f.kind === 'text')) {
    const back = [1.5, 26, 5, 50, 74, 98][j++ % 6] * 36e5; f.edited = Math.max(f.added + 6e5 + j * 7e5, now - back - j * 11 * 6e4); f.edits = 2 + (j * 7) % 19;
  }
  for (const key of Object.keys(mk)) { const fn = mk[key]; mk[key] = (...a) => Object.assign(fn(...a), { added: Date.now() }); }
})();

/* ---------- canvas + ink engine ---------- */
const sheetEl = $('#sheet'), sheetWin = $('#sheetWin'), baseC = $('#base'), liveC = $('#live'), hint = $('#hint'), cursorEl = $('#cursor'), paper = $('#sheet .paper');
const bctx = baseC.getContext('2d');
const lctx = liveC.getContext('2d', { desynchronized: true }) || liveC.getContext('2d');
let sheet;
// keep a window's corners on screen; a window bigger than the screen can still be panned across it
function span(size, view, m) { return size <= view - 2 * m ? [m, view - size - m] : [view - size - m, m]; }
function sheetBounds(b) { const m = fullKey === 'canvas' ? 0 : 8, [x0, x1] = span(PW * b.s, vw(), m), [y0, y1] = span(PH * b.s, vh(), m); return { minX: x0, maxX: x1, minY: y0, maxY: y1 }; }
let canvasK = 0;
// canvases match the window size (with headroom while resizing), never stretched
function allocCanvas(w, h, k) {
  CW = Math.ceil(w); CH = Math.ceil(h); canvasK = k;
  for (const [c, x] of [[baseC, bctx], [liveC, lctx]]) {
    c.width = Math.round(CW * k); c.height = Math.round(CH * k); c.style.width = CW + 'px'; c.style.height = CH + 'px'; x.setTransform(k, 0, 0, k, 0, 0);
  }
  redrawBase();
}
function sizeCanvases(force) {      // the ink is re-rendered sharp for the window scale and the zoom
  const w = PW / Math.min(1, Z), h = PH / Math.min(1, Z), k = Math.min(4, (devicePixelRatio || 1) * clamp(sheet.s * Z, 1, 3), Math.sqrt(12e6 / (w * h)));
  if (!force && Math.abs(k - canvasK) < .05 && CW === Math.ceil(w) && CH === Math.ceil(h)) return;
  allocCanvas(w, h, k);
}
const ZMIN = 1, ZMAX = 4, ZSTEPS = [1, 1.25, 1.5, 2, 2.5, 3, 4], PAPER_PAT = { grid: [24, 24, 0, 0], dots: [22, 22, 11, 11], lines: [0, 32, 0, 70] };
// where the visible corner may sit: on the page when zoomed in; centred while pinched below 100%
function panRange(z) {
  if (z >= 1) return { x0: 0, x1: PW - PW / z, y0: 0, y1: PH - PH / z };
  const cx = (PW - PW / z) / 2, cy = (PH - PH / z) / 2; return { x0: cx, x1: cx, y0: cy, y1: cy };
}
const rub = (v, lo, hi) => v < lo ? lo - (lo - v) * .35 : v > hi ? hi + (v - hi) * .35 : v;     // past an edge the page gives a little, like a scroll view
function clampPan(soft) { const R = panRange(Z), f = soft ? rub : clamp; zx = f(zx, R.x0, R.x1); zy = f(zy, R.y0, R.y1); }
function overscrolled() { const R = panRange(Z); return Z < ZMIN - 1e-3 || Z > ZMAX + 1e-3 || zx < R.x0 - .5 || zx > R.x1 + .5 || zy < R.y0 - .5 || zy > R.y1 + .5; }
function applyZoom(soft) {
  if (!soft) clampPan(); if (zpinch || zpan || zAnim) zoomHud();
  const inkEl = $('#sheet .ink'); inkEl.style.transformOrigin = '0 0';
  inkEl.style.transform = Z === 1 && !zx && !zy ? '' : `scale(${Z.toFixed(4)}) translate(${(-zx).toFixed(2)}px,${(-zy).toFixed(2)}px)`;
  const P = PAPER_PAT[current.paper || 'grid'];          // the paper pattern zooms with the ink
  if (!P || (Z === 1 && !zx && !zy)) paper.style.backgroundSize = paper.style.backgroundPosition = '';
  else { paper.style.backgroundSize = P[0] ? `${P[0] * Z}px ${P[1] * Z}px` : `100% ${P[1] * Z}px`; paper.style.backgroundPosition = `${((P[2] - zx) * Z).toFixed(1)}px ${((P[3] - zy) * Z).toFixed(1)}px`; }
  paper.style.setProperty('--zs', Z.toFixed(4)); paper.classList.toggle('zoomed', Z > 1.01);      // line and dot sizes scale with the zoom
  try { if (sel) updateSelUI(true); } catch (_) {}
}
function zoomSettled() { clearTimeout(zSettleT); zSettleT = setTimeout(() => { sizeCanvases(true); try { if (sel) updateSelUI(); } catch (_) {} }, 120); }
// move the view to (z1, x1, y1) with a short ease-out
function animateView(z1, x1, y1, instant) {
  cancelAnimationFrame(zAnim); cancelAnimationFrame(zglide);
  const z0 = Z, x0 = zx, y0 = zy;
  if (instant || reduceMotion) { Z = z1; zx = x1; zy = y1; zAnim = 0; applyZoom(); zoomHud(); return zoomSettled(); }
  const t0 = performance.now(), d = 300;
  const step = now => { const k = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - k, 3);
    Z = z0 + (z1 - z0) * e; zx = x0 + (x1 - x0) * e; zy = y0 + (y1 - y0) * e; applyZoom(true); zoomHud();
    if (k < 1) zAnim = requestAnimationFrame(step); else { zAnim = 0; applyZoom(); zoomSettled(); } };
  zAnim = requestAnimationFrame(step);
}
// zoom to z1 keeping page point (cx, cy) where it is on screen (default: the middle of what you see)
function zoomTo(z1, cx, cy, instant) {
  z1 = clamp(z1, ZMIN, ZMAX);
  if (cx == null) { cx = zx + PW / Z / 2; cy = zy + PH / Z / 2; }
  const R = panRange(z1);
  animateView(z1, clamp(cx - (cx - zx) * Z / z1, R.x0, R.x1), clamp(cy - (cy - zy) * Z / z1, R.y0, R.y1), instant);
}
// after a gesture: back inside the limits, keeping the point under the fingers (sx, sy on screen) where it is
function settleView(sx, sy) {
  let z1 = clamp(Z, ZMIN, ZMAX); if (Math.abs(z1 - 1) < .15) z1 = 1;
  if (sx == null || Math.abs(z1 - Z) < 1e-3) { const R = panRange(z1); if (!overscrolled() && z1 === Z) return zoomSettled(); return animateView(z1, clamp(zx, R.x0, R.x1), clamp(zy, R.y0, R.y1)); }
  const r = paper.getBoundingClientRect(), k = r.width / PW, ax = zx + (sx - r.left) / k / Z, ay = zy + (sy - r.top) / k / Z;
  zoomTo(z1, ax, ay);
}
function zoomStep(dir) {
  const n = dir > 0 ? ZSTEPS.find(z => z > Z + 1e-3) : [...ZSTEPS].reverse().find(z => z < Z - 1e-3);
  if (n != null) zoomTo(n); else nudge($('#sheetWin'));
}
function startPan(e) { cancelAnimationFrame(zglide); try { sheetEl.setPointerCapture(e.pointerId); } catch (_) {} zpan = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, zx, zy, k: paper.getBoundingClientRect().width / PW, vx: 0, vy: 0, t: e.timeStamp }; }
function movePan(e) { const dt = Math.max(8, e.timeStamp - zpan.t); zpan.vx = zpan.vx * .5 + (e.clientX - zpan.lx) / dt * .5; zpan.vy = zpan.vy * .5 + (e.clientY - zpan.ly) / dt * .5; zpan.t = e.timeStamp; zpan.lx = e.clientX; zpan.ly = e.clientY; zx = zpan.zx - (e.clientX - zpan.x) / zpan.k / Z; zy = zpan.zy - (e.clientY - zpan.y) / zpan.k / Z; clampPan(true); applyZoom(true); }
let zpinch = null, zglide = 0, zhudT = 0, looseFinger = null;
// a finger that lands on the empty desktop next to the note may be the first half of a pinch
for (const [ty, fn] of [['pointerdown', e => { if (e.pointerType === 'touch' && e.isPrimary && !sheetEl.contains(e.target) && isBackground(e.target)) looseFinger = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp }; }],
  ['pointermove', e => { if (looseFinger && e.pointerId === looseFinger.id) { looseFinger.x = e.clientX; looseFinger.y = e.clientY; } }],
  ['pointerup', e => { if (looseFinger && e.pointerId === looseFinger.id) looseFinger = null; }], ['pointercancel', e => { if (looseFinger && e.pointerId === looseFinger.id) looseFinger = null; }]]) addEventListener(ty, fn, true);
// a second finger always means pinch-to-zoom: stop whatever the first finger was doing
function secondFinger(e) {
  if (e.isPrimary) {      // the first finger of a fresh touch: nothing else is on the glass, so any leftover gesture state is stale
    if (zpan) zpan = null;
    if (zpinch) { zpinch = null; $('#sheet .ink').classList.remove('zooming'); }
    if (gest && touches.size) { touches.clear(); gest = null; }
    return false;
  }
  if (ink && ink.type === 'touch') { const keep = { id: ink.id, x: ink.lx ?? e.clientX, y: ink.ly ?? e.clientY }; ink.stroke = null; ink.removed = false; lctx.clearRect(0, 0, CW, CH); ink = null; document.body.classList.remove('inking'); startPinch(keep, e); return true; }
  if (zpan && zpan.id !== e.pointerId) { const keep = { id: zpan.id, x: zpan.lx, y: zpan.ly }; zpan = null; startPinch(keep, e); return true; }
  if (looseFinger && looseFinger.id !== e.pointerId && e.timeStamp - looseFinger.t < 1500) { const a = looseFinger; looseFinger = null; startPinch(a, e); return true; }
  if (gest && touches.size === 1) { const [id, pt] = [...touches.entries()][0]; endGesture(e, true); sheet.place(sheet.x, sheet.y); startPinch({ id, x: pt.x, y: pt.y }, e); return true; }      // the window stops dead: the pinch zooms the page, not the window
  return false;
}
document.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch' || zpinch || sheetEl.contains(e.target) || e.target.closest('#dock, #topbar, #toolPop, #ctxMenu, #emojiPop')) return;
  if (secondFinger(e)) { e.preventDefault(); e.stopPropagation(); }
}, true);
// the zoom level shows while you change it, then fades (as GoodNotes and Notability do)
function zoomHud() {
  const h = $('#zoomHud'); h.textContent = Math.round(Z * 100) + '%'; h.classList.add('on');
  clearTimeout(zhudT); zhudT = setTimeout(() => h.classList.remove('on'), 700);
}
function startPinch(a, e) {      // a: the finger already down {id, x, y}; e: the second finger
  try { sheetEl.setPointerCapture(e.pointerId); } catch (_) {} try { sheetEl.setPointerCapture(a.id); } catch (_) {}
  cancelAnimationFrame(zAnim); cancelAnimationFrame(zglide); zAnim = 0; $('#sheet .ink').classList.add('zooming');
  const pts = new Map([[a.id, { x: a.x, y: a.y }], [e.pointerId, { x: e.clientX, y: e.clientY }]]);
  const [p, q] = [...pts.values()], r = paper.getBoundingClientRect(), k = r.width / PW, c = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  zpinch = { pts, d0: Math.max(20, Math.hypot(p.x - q.x, p.y - q.y)), Z0: Z, r, k, anchor: toLocal({ clientX: c.x, clientY: c.y }, r, k) };
}
function movePinch(e) {
  zpinch.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const [p, q] = [...zpinch.pts.values()], d = Math.hypot(p.x - q.x, p.y - q.y), { anchor } = zpinch, r = paper.getBoundingClientRect(), k = r.width / PW;
  let z = zpinch.Z0 * d / zpinch.d0;
  z = z < ZMIN ? Math.max(.6, ZMIN - (ZMIN - z) * .35) : z > ZMAX ? ZMAX + (z - ZMAX) * .3 : z;          // a little give past the limits
  const c = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }; zpinch.c = c;
  // the page point that was between the fingers stays between them
  Z = z; zx = anchor.x - (c.x - r.left) / k / z; zy = anchor.y - (c.y - r.top) / k / z; clampPan(true); applyZoom(true);
}
let zpinch_c = null;
function endPinch(e) {
  zpinch_c = zpinch.c; zpinch = null; $('#sheet .ink').classList.remove('zooming');
  const c = zpinch_c || null; zpinch_c = null;
  settleView(c && c.x, c && c.y);      // eases back inside the limits around the same point; close to 100% snaps to it
}
let lastTap = { t: 0, x: 0, y: 0 }, tapDown = null;
function glide(vx, vy, k) {        // px per ms on screen; slows to a stop like a scroll view
  if (reduceMotion || Math.hypot(vx, vy) < .25) return;
  let last = performance.now();
  const step = now => { const dt = Math.min(32, now - last); last = now; zx -= vx * dt / k / Z; zy -= vy * dt / k / Z; const f = Math.pow(.994, dt); vx *= f; vy *= f; applyZoom();
    if (Math.hypot(vx, vy) > .02) zglide = requestAnimationFrame(step); };
  zglide = requestAnimationFrame(step);
}
function ensureCanvas(w, h) { if (w > CW || h > CH) allocCanvas(Math.max(w, CW) + 160, Math.max(h, CH) + 120, canvasK || (devicePixelRatio || 1)); }
function redrawBase() { bctx.clearRect(0, 0, CW, CH); const ex = sel ? new Set(sel.strokes) : null; for (const s of current.strokes) if (!ex || !ex.has(s)) drawStroke(bctx, s); }
function setSize(w, h) {
  PW = w; PH = h; ensureCanvas(w, h);
  sheetEl.style.setProperty('--pw', w.toFixed(1) + 'px'); sheetEl.style.setProperty('--ph', h.toFixed(1) + 'px');
  $('#sizetag').textContent = `${Math.round(w)} × ${Math.round(h)}`;
}
const MIN_W = 380, MIN_H = 280;
// growing around the centre: as big as fits on both sides of it
function centredMax(s0) {
  const cx = s0.bx + s0.w * s0.s / 2, cy = s0.by + s0.h * s0.s / 2;
  return { w: Math.max(MIN_W, 2 * Math.min(cx - 6, vw() - 6 - cx) / s0.s), h: Math.max(MIN_H, 2 * Math.min(cy - 6, vh() - 6 - cy) / s0.s) };
}
const maxSize = () => ({ w: Math.max(MIN_W, (vw() - 12 - Math.max(0, sheet.x)) / sheet.s), h: Math.max(MIN_H, (vh() - 12 - Math.max(0, sheet.y)) / sheet.s) });
let sizeAnim = 0;
function animateSize(tw, th, done, K = 190, D = 27) {     // same spring as the window position, so size and place move as one
  cancelAnimationFrame(sizeAnim);
  ensureCanvas(Math.max(tw, PW), Math.max(th, PH));
  sheetEl.classList.add('resizing');
  let w = PW, h = PH, vw_ = 0, vh_ = 0, last = performance.now();
  const step = now => {
    const dt = Math.min(.034, (now - last) / 1000); last = now;
    for (let i = 0; i < 4; i++) { const d = dt / 4; vw_ += (-K * (w - tw) - D * vw_) * d; vh_ += (-K * (h - th) - D * vh_) * d; w += vw_ * d; h += vh_ * d; }
    if ((Math.abs(w - tw) < .4 && Math.abs(h - th) < .4 && Math.abs(vw_) + Math.abs(vh_) < 6) || reduceMotion) {
      setSize(tw, th); sheetEl.classList.remove('resizing'); sizeCanvases(true); done && done(); return;
    }
    setSize(w, h); sizeAnim = requestAnimationFrame(step);
  };
  sizeAnim = requestAnimationFrame(step);
}

const TOOLS = {
  pen:    { label: 'Pen', type: 'fountain', sizes: [1.4, 2.4, 4], si: 1, color: 'graphite', pressure: true, smooth: .3 },
  pencil: { label: 'Pencil', sizes: [1.6, 2.6, 4.2], si: 1, color: 'graphite', pressure: true, smooth: .2 },
  hl:     { label: 'Highlighter', sizes: [12, 18, 26], si: 1, color: 'ochre', opacity: .32, straight: false, smooth: .4 },
  eraser: { label: 'Eraser', sizes: [8, 16, 30], si: 1, mode: 'stroke', hlOnly: false },
  lasso:  { label: 'Lasso' },
  text:   { label: 'Text', sizes: [16, 24, 40], si: 1, color: 'graphite', font: 'inter' },
  shape:  { label: 'Shapes', sizes: [1.6, 2.4, 4], si: 1, color: 'sky', fill: false },
  laser:  { label: 'Laser pointer', color: 'kodak' },
};
const prefs = { holdShape: true };
let tool = 'pen', fingerDraws = false;
const sizeFor = t => TOOLS[t].sizes ? TOOLS[t].sizes[TOOLS[t].si] : 4;
const inkTool = t => !!TOOLS[t].color && t !== 'laser';

let ink = null, fading = [], lasers = [], sel = null, liveRaf = 0, lastPen = -1e9, ants = 0;
function scheduleLive() { if (!liveRaf) liveRaf = requestAnimationFrame(frame); }
// segments i0..i1-1 of a stroke, exactly as drawStroke draws them
function strokeSegs(ctx, pts, i0, i1, w) {
  const n = pts.length; if (i0 < 1) i0 = 1;
  let px = i0 === 1 ? pts[0].x : (pts[i0 - 1].x + pts[i0].x) / 2, py = i0 === 1 ? pts[0].y : (pts[i0 - 1].y + pts[i0].y) / 2;
  for (let i = i0; i < i1 && i < n; i++) {
    const a = pts[i], last = i === n - 1, mx = last ? a.x : (a.x + pts[i + 1].x) / 2, my = last ? a.y : (a.y + pts[i + 1].y) / 2;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(a.x, a.y, mx, my);
    ctx.lineWidth = w((pts[i - 1].p + a.p) / 2, i, pts[Math.max(0, i - 3)], pts[Math.min(n - 1, i + 2)]); ctx.stroke(); px = mx; py = my;
  }
}
const incrementable = st => st && st.tool !== 'hl' && st.tool !== 'shape' && !st.shaped && st.pts.length > 1;
function liveIncremental(st) {
  const inc = ink.inc || (ink.inc = { done: 1, tip: null }), real = st.pts, all = ink.pred.length ? real.concat(ink.pred) : real;
  const stable = Math.max(1, real.length - 9), col = inkColor(st.color), m = st.size * 2.6 + 4;
  lctx.save(); lctx.lineCap = 'round'; lctx.lineJoin = 'round';
  lctx.strokeStyle = lctx.fillStyle = st.tool === 'pencil' ? pencilPattern(lctx, col) : col;
  // segments far enough from the tip never change again: draw them once
  if (stable > inc.done) { strokeSegs(lctx, real, inc.done, stable, widthFn(st, real.length)); inc.done = stable; }
  // the tip (last few segments and the predicted points) is redrawn each frame inside a small rectangle
  if (inc.tip) {
    const [x, y, w, h] = inc.tip; lctx.clearRect(x, y, w, h);
    lctx.save(); lctx.beginPath(); lctx.rect(x, y, w, h); lctx.clip();
    const wf = widthFn(st, real.length);
    for (let i = 1; i < inc.done; i++) {      // put back any settled ink that the clear touched
      const a = real[i - 1], b = real[i];
      if (Math.max(a.x, b.x) + m >= x && Math.min(a.x, b.x) - m <= x + w && Math.max(a.y, b.y) + m >= y && Math.min(a.y, b.y) - m <= y + h) strokeSegs(lctx, real, i, i + 1, wf);
    }
    lctx.restore();
  }
  strokeSegs(lctx, all, inc.done, all.length, widthFn(st, all.length));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = Math.max(0, inc.done - 2); i < all.length; i++) { const p = all[i]; if (p.x < x0) x0 = p.x; if (p.y < y0) y0 = p.y; if (p.x > x1) x1 = p.x; if (p.y > y1) y1 = p.y; }
  inc.tip = [x0 - m, y0 - m, x1 - x0 + 2 * m, y1 - y0 + 2 * m];
  lctx.restore();
}
function frame() {
  liveRaf = 0;
  if (ink && ink.stroke && !sel && !ink.lasso && !lasers.length && !fading.length && incrementable(ink.stroke)) return liveIncremental(ink.stroke);
  if (ink) ink.inc = null;
  lctx.clearRect(0, 0, CW, CH); let again = false; const t = performance.now();
  if (sel) { lctx.save(); lctx.translate(sel.dx, sel.dy); lctx.shadowColor = themeColor('--accent'); lctx.shadowBlur = 6; for (const s of sel.strokes) drawStroke(lctx, s); lctx.restore(); }
  if (ink && ink.stroke) drawStroke(lctx, ink.stroke, ink.pred);
  if (ink && ink.lasso && ink.lasso.length > 1) {
    lctx.save(); lctx.setLineDash([6, 6]); ants = (ants + .6) % 12; lctx.lineDashOffset = -ants; lctx.lineWidth = 1.5;
    lctx.strokeStyle = themeColor('--accent'); lctx.fillStyle = themeColor('--accent-soft');
    lctx.beginPath(); ink.lasso.forEach((p, i) => i ? lctx.lineTo(p.x, p.y) : lctx.moveTo(p.x, p.y)); lctx.closePath(); lctx.fill(); lctx.stroke(); lctx.restore(); again = true;
  }
  lasers = lasers.filter(L => {
    if (!L.end) L.pts = L.pts.filter(p => t - p.t < 900);
    const a = L.end ? 1 - (t - L.end) / 650 : 1; if (a <= 0) return false;
    drawLaser(lctx, L.pts, L.color, a); again = true; return true;
  });
  if (fading.length) {
    fading = fading.filter(f => { const a = 1 - (t - f.t) / 280; if (a <= 0) return false; lctx.save(); lctx.globalAlpha = a; drawStroke(lctx, f.s); lctx.restore(); return true; });
    if (fading.length) again = true;
  }
  if (again) scheduleLive();
}
function toLocal(ev, r, k) { return { x: (ev.clientX - r.left) / k / Z + zx, y: (ev.clientY - r.top) / k / Z + zy }; }      // screen → page, through the zoom
function makePt(ev) {
  const q = toLocal(ev, ink.r, ink.k); let p;
  const pts = ink.stroke.pts, prev = pts[pts.length - 1];
  if (ev.pointerType === 'pen') { p = ev.pressure > 0 ? ev.pressure : ink.lastP; p = ink.lastP * .35 + p * .65; }
  else if (prev) { const dt = Math.max(1, ev.timeStamp - ink.lastT); const sp = Math.hypot(q.x - prev.x, q.y - prev.y) / dt; p = ink.lastP * .75 + clamp(.8 - sp * .3, .28, .8) * .25; }
  else p = .6;
  ink.lastP = p; ink.lastT = ev.timeStamp; ink.raw = q;
  let x = q.x, y = q.y;
  if (ink.smooth && prev) { const f = 1 - ink.smooth * .78; x = prev.x + (q.x - prev.x) * f; y = prev.y + (q.y - prev.y) * f; }   // stroke stabiliser
  return { x: +x.toFixed(2), y: +y.toFixed(2), p: +p.toFixed(3) };
}
// Precise mode: a ring the size of the eraser follows the tip, so you see exactly what goes
function eraseRing(q) {
  if (!q || TOOLS.eraser.mode !== 'precise') return;
  const d = sizeFor('eraser') * 2 * Z;
  cursorEl.style.width = cursorEl.style.height = d + 'px'; cursorEl.style.background = '';
  cursorEl.style.transform = `translate(${(q.x - zx) * Z - d / 2}px,${(q.y - zy) * Z - d / 2}px)`;
  cursorEl.classList.add('ring', 'on');
}
function startInk(e) {
  const r = paper.getBoundingClientRect();
  ink = { id: e.pointerId, type: e.pointerType, r, k: r.width / PW, stroke: null, lastP: .5, lastT: e.timeStamp, pred: [], removed: false, before: current.strokes.slice(), anchor: null, hold: 0, smooth: 0 };
  try { sheetEl.setPointerCapture(e.pointerId); } catch (_) {}
  document.body.classList.add('inking'); cursorEl.classList.remove('on', 'ring'); closeToolPop();
  const q = toLocal(e, r, ink.k);
  if (tool === 'eraser') { ink.erase = true; eraseAt(q); eraseRing(q); return; }
  if (tool === 'text') { ink.textAt = performance.now() - textClosedAt < 80 ? null : q; ink.isText = true; return; }
  if (tool === 'lasso') {
    if (sel && inSel(q)) { ink.move = { x: q.x, y: q.y, dx: sel.dx, dy: sel.dy }; selMenu.hidden = true; }
    else { clearSel(); ink.lasso = [q]; }
    scheduleLive(); return;
  }
  if (tool === 'laser') { ink.laser = { pts: [{ ...q, t: performance.now() }], color: TOOLS.laser.color, end: 0 }; lasers.push(ink.laser); scheduleLive(); return; }
  clearSel();
  const T = TOOLS[tool];
  ink.smooth = T.smooth || 0;
  ink.stroke = { tool, type: T.type, color: T.color, size: sizeFor(tool), pr: T.pressure !== false, pts: [] };
  if (tool === 'hl') ink.stroke.op = T.opacity;
  if (tool === 'shape') ink.stroke.fill = T.fill;
  ink.stroke.pts.push(makePt(e)); ink.anchor = ink.stroke.pts[0];
  hint.classList.add('gone'); scheduleLive();
}
function moveInk(e) {      // runs for every pen sample; keep it free of layout reads
  if (ink.isText) return;
  const evs = (e.getCoalescedEvents && e.getCoalescedEvents()) || []; const list = evs.length ? evs : [e];
  if (ink.erase) { let q; for (const ev of list) eraseAt(q = toLocal(ev, ink.r, ink.k)); eraseRing(q); return; }
  if (ink.move) { const q = toLocal(e, ink.r, ink.k); sel.dx = ink.move.dx + q.x - ink.move.x; sel.dy = ink.move.dy + q.y - ink.move.y; updateSelUI(true); scheduleLive(); return; }
  if (ink.lasso) { for (const ev of list) ink.lasso.push(toLocal(ev, ink.r, ink.k)); scheduleLive(); return; }
  if (ink.laser) { const t = performance.now(); for (const ev of list) ink.laser.pts.push({ ...toLocal(ev, ink.r, ink.k), t }); scheduleLive(); return; }
  if (!ink.stroke) return;
  const pts = ink.stroke.pts;
  for (const ev of list) { const pt = makePt(ev), l = pts[pts.length - 1]; if (Math.hypot(pt.x - l.x, pt.y - l.y) > .35) pts.push(pt); }
  if (ink.stroke.tool === 'hl' && TOOLS.hl.straight) { ink.stroke.pts = [pts[0], { ...ink.raw, p: pts[0].p }]; ink.stroke.flat = true; ink.pred = []; }
  else if (!ink.stroke.shaped) {
    const pr = (e.getPredictedEvents && e.getPredictedEvents()) || [];
    ink.pred = pr.slice(0, 2).map(ev => { const q = toLocal(ev, ink.r, ink.k); return { x: q.x, y: q.y, p: ink.lastP }; });
  }
  const last = ink.stroke.pts[ink.stroke.pts.length - 1];
  if (Math.hypot(last.x - ink.anchor.x, last.y - ink.anchor.y) > 3) { ink.anchor = last; clearTimeout(ink.hold); ink.hold = setTimeout(holdSnap, 520); }
  scheduleLive();
}

/* ---------- shape recognition (shape tool, or draw and hold with pen/pencil) ---------- */
function rdp(pts, eps) {
  if (pts.length < 3) return pts.slice();
  const a = pts[0], b = pts[pts.length - 1]; let idx = 0, md = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = segDist(pts[i], a, b); if (d > md) { md = d; idx = i; } }
  if (md <= eps) return [a, b];
  return rdp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(pts.slice(idx), eps));
}
function pruneCollinear(poly) {
  let changed = true;
  while (changed && poly.length > 3) {
    changed = false;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[(i - 1 + poly.length) % poly.length], b = poly[i], c = poly[(i + 1) % poly.length];
      let d = Math.abs(Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x)); if (d > Math.PI) d = 2 * Math.PI - d;
      if (d < .45) { poly.splice(i, 1); changed = true; break; }
    }
  }
  return poly;
}
function densify(poly, closed, p) {
  const out = [], seq = closed ? poly.concat([poly[0]]) : poly;
  for (let i = 0; i < seq.length - 1; i++) {
    const a = seq[i], b = seq[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4));
    for (let j = 0; j < n; j++) out.push({ x: a.x + (b.x - a.x) * j / n, y: a.y + (b.y - a.y) * j / n, p });
  }
  const z = seq[seq.length - 1]; out.push({ x: z.x, y: z.y, p }); return out;
}
function recognize(pts, lineOnly) {
  const n = pts.length; if (n < 6) return null;
  let len = 0; for (let i = 1; i < n; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const a = pts[0], b = pts[n - 1], chord = Math.hypot(b.x - a.x, b.y - a.y);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const q of pts) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
  const bw = x1 - x0, bh = y1 - y0, diag = Math.hypot(bw, bh), pAvg = pts.reduce((s, q) => s + q.p, 0) / n;
  if (diag < 20) return null;
  if (chord / len > .9) return { kind: 'line', closed: false, pts: densify([a, b], false, pAvg) };
  if (lineOnly) return null;
  const closed = chord < Math.max(22, len * .16);
  if (!closed) { const simp = rdp(pts, diag * .06); return simp.length <= 4 ? { kind: 'angle', closed: false, pts: densify(simp, false, pAvg) } : null; }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.max(1, bw / 2), ry = Math.max(1, bh / 2);
  let err = 0; for (const q of pts) err += Math.abs(Math.hypot((q.x - cx) / rx, (q.y - cy) / ry) - 1); err /= n;
  let poly = rdp(pts, diag * .08);
  if (poly.length > 1 && Math.hypot(poly[0].x - poly[poly.length - 1].x, poly[0].y - poly[poly.length - 1].y) < diag * .2) poly.pop();
  poly = pruneCollinear(poly);
  if (poly.length === 3 && err > .07) return { kind: 'triangle', closed: true, pts: densify(poly, true, pAvg) };
  if (poly.length === 4 && err > .07) {
    const axis = poly.every((q, i) => { const r = poly[(i + 1) % 4]; const ang = Math.abs(Math.atan2(r.y - q.y, r.x - q.x)) % (Math.PI / 2); return ang < .22 || ang > Math.PI / 2 - .22; });
    const quad = axis ? [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }] : poly;
    return { kind: 'rectangle', closed: true, pts: densify(quad, true, pAvg) };
  }
  if (err < .16) {
    let Rx = rx, Ry = ry; if (Math.abs(rx - ry) < Math.max(rx, ry) * .14) Rx = Ry = (rx + ry) / 2;
    const out = []; for (let i = 0; i <= 96; i++) { const t = i / 96 * Math.PI * 2 - Math.PI / 2; out.push({ x: cx + Math.cos(t) * Rx, y: cy + Math.sin(t) * Ry, p: pAvg }); }
    return { kind: Rx === Ry ? 'circle' : 'ellipse', closed: true, pts: out };
  }
  return null;
}
function applyShape(s, res) { if (ink) ink.inc = null; lctx.clearRect(0, 0, CW, CH); s.pts = res.pts; s.closed = res.closed; s.shaped = true; s.bb = null; liveC.classList.remove('flash'); void liveC.offsetWidth; liveC.classList.add('flash'); }
function holdSnap() {
  if (!ink || !ink.stroke || ink.stroke.shaped) return;
  const s = ink.stroke, hl = s.tool === 'hl';
  if (!prefs.holdShape && !hl) return;
  const res = recognize(s.pts, hl); if (!res) return;
  applyShape(s, res); ink.pred = []; ink.anchor = s.pts[s.pts.length - 1]; scheduleLive();
}
function endInk() {
  if (!ink) return; clearTimeout(ink.hold); cursorEl.classList.remove('ring', 'on');
  if (ink.isText) { const q = ink.textAt; ink = null; document.body.classList.remove('inking'); if (q) textTap(q); return; }
  const s = ink.stroke;
  if (ink.move) { if (sel.dx || sel.dy) commitSelMove(); else updateSelUI(); }
  else if (ink.lasso) finishLasso(ink.lasso);
  else if (ink.laser) ink.laser.end = performance.now();
  else if (s && s.pts.length) {
    if (s.tool === 'hl' && s.flat) s.pts = densify([s.pts[0], s.pts[s.pts.length - 1]], false, s.pts[0].p);
    else if (ink.raw && !s.shaped) { const l = s.pts[s.pts.length - 1]; if (Math.hypot(ink.raw.x - l.x, ink.raw.y - l.y) > .5) s.pts.push({ x: ink.raw.x, y: ink.raw.y, p: l.p }); }
    if (s.tool === 'shape' && !s.shaped) { const res = recognize(s.pts); if (res) applyShape(s, res); }
    ink.pred = []; commit(ink.before); current.strokes.push(s); drawStroke(bctx, s);
  } else if (ink.removed) commit(ink.before);
  const hadInc = ink.inc; ink = null; if (hadInc) lctx.clearRect(0, 0, CW, CH); scheduleLive();
  document.body.classList.remove('inking');
  noteChanged();
}
function markEdited(f) { if (!f) return; f.edited = Date.now(); f.edits = (f.edits || 0) + 1; }
function commit(before) { markEdited(current); current.undo.push(before); if (current.undo.length > 80) current.undo.shift(); current.redo = []; }
function bbox(s) {
  if (s.bb) return s.bb; let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  for (const p of s.pts) { a = Math.min(a, p.x); b = Math.min(b, p.y); c = Math.max(c, p.x); d = Math.max(d, p.y); }
  return (s.bb = [a, b, c, d]);
}
function segDist(p, a, b) { const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy; const t = l ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l, 0, 1) : 0; return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); }
function eraseAt(q) {
  const T = TOOLS.eraser, r = sizeFor('eraser'); let hit = false;
  for (let i = current.strokes.length - 1; i >= 0; i--) {
    const s = current.strokes[i]; if (T.hlOnly && s.tool !== 'hl') continue;
    const bb = bbox(s), pad = r + s.size;
    if (q.x < bb[0] - pad || q.x > bb[2] + pad || q.y < bb[1] - pad || q.y > bb[3] + pad) continue;
    if (s.tool === 'text') {
      if (q.x > bb[0] - r && q.x < bb[2] + r && q.y > bb[1] - r && q.y < bb[3] + r) { current.strokes.splice(i, 1); fading.push({ s, t: performance.now() }); hit = true; }
      continue;
    }
    const pts = s.pts, lim = r + s.size / 2;
    if (T.mode === 'precise') {        // cut out only the touched part
      const runs = [[]]; let touched = false;
      for (const p of pts) { if (Math.hypot(p.x - q.x, p.y - q.y) < lim) { touched = true; if (runs[runs.length - 1].length) runs.push([]); } else runs[runs.length - 1].push(p); }
      if (!touched) continue;
      const pieces = runs.filter(x => x.length > 1).map(x => ({ ...s, pts: x, bb: null, closed: false }));
      current.strokes.splice(i, 1, ...pieces); hit = true; continue;
    }
    let h = false;
    for (let j = 0; j < pts.length && !h; j++) h = (j ? segDist(q, pts[j - 1], pts[j]) : Math.hypot(q.x - pts[0].x, q.y - pts[0].y)) < lim;
    if (h) { current.strokes.splice(i, 1); fading.push({ s, t: performance.now() }); hit = true; }
  }
  if (hit) { ink.removed = true; redrawBase(); scheduleLive(); }
}
function clearPage() {
  if (!current.strokes.length) return toast('This page is already empty');
  clearSel(); commit(current.strokes.slice());
  const t = performance.now(); current.strokes.forEach(s => fading.push({ s, t })); current.strokes = [];
  redrawBase(); scheduleLive(); noteChanged(); toast('Page cleared. Undo brings it back.');
}

/* ---------- lasso selection ---------- */
function pip(pt, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; }
let textEd = null, textClosedAt = -1e9;
function textTap(q) {
  const hit = current.strokes.slice().reverse().find(s => { if (s.tool !== 'text') return false; const b = bbox(s); return q.x > b[0] - 6 && q.x < b[2] + 6 && q.y > b[1] - 6 && q.y < b[3] + 6; });
  openTextEditor(hit ? hit.pts[0] : { x: q.x, y: q.y - sizeFor('text') * .65 }, hit);
}
function openTextEditor(at, s0) {
  if (textEd) commitText();
  const T = TOOLS.text, st = s0 ? { font: s0.font, size: s0.size, color: s0.color } : { font: T.font, size: sizeFor('text'), color: T.color };
  const before = current.strokes.slice();
  if (s0) { current.strokes.splice(current.strokes.indexOf(s0), 1); redrawBase(); }
  const ta = document.createElement('textarea'); ta.className = 'textedit'; ta.value = s0 ? s0.text : ''; ta.rows = 1;
  ta.setAttribute('aria-label', t('Text')); ta.spellcheck = true; ta.autocapitalize = 'sentences';
  document.body.append(ta); hint.classList.add('gone');
  textEd = { ta, at, st, before, s0 };
  const place = () => {
    const r = paper.getBoundingClientRect(), k = r.width / PW;
    Object.assign(ta.style, { left: (r.left + at.x * k - 6.5) + 'px', top: (r.top + at.y * k - 4.5 - st.size * .06 * k) + 'px', font: `${st.size * k}px/${TEXT_LH} ${fontCss(st.font)}`, color: inkColor(st.color) });
    ta.style.width = '0'; ta.style.height = '0';
    ta.style.width = Math.max(st.size * k * 2, ta.scrollWidth + st.size * k * .6) + 'px'; ta.style.height = ta.scrollHeight + 'px';
  };
  place(); ta.addEventListener('input', place);
  ta.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); commitText(); } });
  ta.addEventListener('blur', () => { if (textEd && textEd.ta === ta) commitText(); });
  if (!reduceMotion) ta.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2,.9,.3,1)' });
  ta.focus({ preventScroll: true });
}
function commitText() {
  const ed = textEd; if (!ed) return; textEd = null; textClosedAt = performance.now();
  const text = ed.ta.value.replace(/\s+$/, ''); ed.ta.remove();
  if (text) {
    const { w, h } = textBox(text, ed.st.size, ed.st.font);
    current.strokes.push({ tool: 'text', text, font: ed.st.font, size: ed.st.size, color: ed.st.color, pts: textPts(ed.at.x, ed.at.y, w, h, ed.st.size) });
  }
  if (text || ed.s0) { if (!ed.s0 || text !== ed.s0.text) commit(ed.before); else current.strokes.splice(current.strokes.length - 1, 0); }
  hint.classList.add('gone'); redrawBase(); noteChanged();
}
// tapping anywhere else finishes the text
document.addEventListener('pointerdown', e => { if (textEd && e.target !== textEd.ta) commitText(); }, true);
// import your own typeface (kept on this device)
const fontInput = document.createElement('input'); fontInput.type = 'file'; fontInput.accept = '.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2'; fontInput.hidden = true; document.body.append(fontInput);
function fontStore(mode, fn) {
  return new Promise(res => {
    try { const rq = indexedDB.open('olaa-fonts', 1); rq.onupgradeneeded = () => rq.result.createObjectStore('f', { keyPath: 'id' });
      rq.onsuccess = () => { try { const tx = rq.result.transaction('f', mode), r2 = fn(tx.objectStore('f')); tx.oncomplete = () => res(r2 && r2.result); tx.onerror = () => res(null); } catch (_) { res(null); } };
      rq.onerror = () => res(null);
    } catch (_) { res(null); }
  });
}
async function addFont(id, name, buf) {
  const fam = 'OlaaFont-' + id, ff = new FontFace(fam, buf); await ff.load(); document.fonts.add(ff);
  if (!FONTS.some(f => f.id === id)) FONTS.push({ id, name, css: `"${fam}", system-ui, sans-serif`, own: true });
}
fontInput.addEventListener('change', async () => {
  const file = fontInput.files[0]; fontInput.value = ''; if (!file) return;
  if (file.size > 12e6) return toast(t('That font file is too large (over 12 MB).'));
  const id = 'u' + Date.now().toString(36), name = file.name.replace(/\.[^.]+$/, '').slice(0, 40);
  try {
    const buf = await file.arrayBuffer(); await addFont(id, name, buf);
    TOOLS.text.font = id; try { localStorage.setItem('olaa-font', id); } catch (_) {}
    fontStore('readwrite', st => st.put({ id, name, buf }));
    if (popKind === 'text') renderToolPop(); drawPreview(); redrawBase(); toast(`${t('Font added')}: ${name}`);
  } catch (_) { toast(t('Couldn’t read that font file. Try a TTF, OTF, WOFF or WOFF2.')); }
});
fontStore('readonly', st => st.getAll()).then(async list => {
  for (const f of list || []) { try { await addFont(f.id, f.name, f.buf); } catch (_) {} }
  try { const id = localStorage.getItem('olaa-font'); if (id && FONTS.some(f => f.id === id)) TOOLS.text.font = id; } catch (_) {}
  if (list && list.length) redrawBase();
});
function finishLasso(poly) {
  if (poly.length < 4) return;
  const picked = current.strokes.filter(s => { const step = Math.max(1, Math.floor(s.pts.length / 24)); let inn = 0, tot = 0; for (let i = 0; i < s.pts.length; i += step) { tot++; if (pip(s.pts[i], poly)) inn++; } return inn / tot >= .5; });
  if (!picked.length) { toast('Nothing inside the loop'); return; }
  sel = { strokes: picked, dx: 0, dy: 0 }; redrawBase(); updateSelUI(); scheduleLive();
}
function selBounds() {
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  for (const s of sel.strokes) { const q = bbox(s), m = s.size / 2 + 2; a = Math.min(a, q[0] - m); b = Math.min(b, q[1] - m); c = Math.max(c, q[2] + m); d = Math.max(d, q[3] + m); }
  return { x: a + sel.dx, y: b + sel.dy, w: c - a, h: d - b };
}
function inSel(q) { const b = selBounds(); return q.x > b.x - 12 && q.x < b.x + b.w + 12 && q.y > b.y - 12 && q.y < b.y + b.h + 12; }
function clearSel() { if (!sel) return; sel = null; selBox.hidden = selMenu.hidden = true; redrawBase(); scheduleLive(); }
function replaceSel(fn) {        // immutable update, so undo keeps the old strokes
  const before = current.strokes.slice(), map = new Map();
  sel.strokes.forEach(s => map.set(s, fn(s)));
  current.strokes = current.strokes.map(s => map.has(s) ? map.get(s) : s).filter(Boolean);
  sel.strokes = sel.strokes.map(s => map.get(s)).filter(Boolean);
  commit(before);
}
const shifted = (s, dx, dy) => ({ ...s, bb: null, pts: s.pts.map(p => ({ x: p.x + dx, y: p.y + dy, p: p.p })) });
function commitSelMove() { const { dx, dy } = sel; sel.dx = sel.dy = 0; replaceSel(s => shifted(s, dx, dy)); redrawBase(); updateSelUI(); noteChanged(); }
function undo() { clearSel(); if (!current.undo.length) return pulse($('#undo')); current.redo.push(current.strokes.slice()); current.strokes = current.undo.pop(); markEdited(current); redrawBase(); noteChanged(); }
function redo() { clearSel(); if (!current.redo.length) return pulse($('#redo')); current.undo.push(current.strokes.slice()); current.strokes = current.redo.pop(); markEdited(current); redrawBase(); noteChanged(); }
function pulse(el) { el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }], { duration: 260 }); }
let thumbTimer = 0;
const HINTS = ['Start with one line.', 'Small notes count too.', 'Write it down. Let it settle.', 'Your page, your pace.', 'One thought is enough to begin.'];
function setHintLine() { if (current.hintI == null) current.hintI = Math.floor(Math.random() * HINTS.length); $('#hintLine').textContent = t(HINTS[current.hintI]); }
function noteChanged() {
  hint.classList.toggle('gone', current.strokes.length > 0); setHintLine();
  updateMeta(); clearTimeout(thumbTimer);
  const later = () => { if (ink || performance.now() - lastPen < 400) { thumbTimer = setTimeout(later, 400); return; } repaintThumbs(current); renderToday(); };
  thumbTimer = setTimeout(later, 600);
}
function updateMeta() {
  const n = current.strokes.length, m = current.mood;
  const sp = '<i class="sp"></i>', date = current.date === todayEN ? fmtL().format(new Date()) : current.date;
  $('#noteMeta').innerHTML = `<span class="md">${esc(date)}</span>${m != null ? sp + emo(m, 15) : ''}${n ? sp + esc(n === 1 ? t('1 stroke') : t('{n} strokes', { n })) : ''}`
    + `<span class="st ${current.draft ? 'draft' : 'saved'}">${esc(current.draft ? t('Draft · not saved') : t('Saved'))}</span>`;
  syncNoteChip();
}
function setPaper(v) { current.paper = v; paper.className = 'paper pp-' + v; applyZoom(); }

// Pencil inks, finger moves/pinches, mouse inks (middle button or Space to move)
const touches = new Map(); let gest = null, spaceDown = false;
sheetEl.addEventListener('pointerdown', e => {
  if (e.target.closest('.grip, .title, .lights, .resize, .selmenu')) return;
  e.preventDefault();
  const collapsed = sheetEl.classList.contains('collapsed');
  if (e.pointerType === 'pen') { lastPen = e.timeStamp; if (gest) endGesture(e, true); if (!ink && !collapsed) startInk(e); return; }
  if (e.pointerType === 'mouse') { if (e.button === 1 || spaceDown || (collapsed && e.button === 0)) return addTouch(e); if (e.button === 0 && !ink) startInk(e); return; }
  if (ink && ink.type === 'pen') return;
  if (e.width > 120 && e.height > 120) return;      // a resting palm; iPad reports ordinary fingertips up to ~60 px wide
  if ((fingerDraws || tool === 'text') && !collapsed && !ink && !touches.size && e.timeStamp - lastPen > 900) { startInk(e); return; }
  if (secondFinger(e)) return;
  if (zpinch) return;
  if (!fingerDraws && e.timeStamp - lastPen < 500) return;
  // double-tap: 200% at that spot, or back to 100%
  if (!fingerDraws && e.timeStamp - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 36) {
    lastTap.t = 0; const r = paper.getBoundingClientRect(), q = toLocal(e, r, r.width / PW); zoomTo(Z > 1.05 ? 1 : 2, q.x, q.y); return;
  }
  tapDown = { id: e.pointerId, t: e.timeStamp, x: e.clientX, y: e.clientY };
  if ((Z > 1 || fullKey === 'split') && !touches.size && !gest) { if (!zpan) startPan(e); return; }
  addTouch(e);
});
function addTouch(e) { try { sheetEl.setPointerCapture(e.pointerId); } catch (_) {} touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); startGesture(e); }
function centroid(p) { return p.length > 1 ? { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 } : p[0]; }
function startGesture() {
  const pts = [...touches.values()].slice(0, 2);
  gest = { x0: sheet.x, y0: sheet.y, s0: sheet.s, c0: centroid(pts), d0: pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0, n: pts.length };
  if (sheet.mode !== 'drag') sheet.grab();
  clearTimeout(cornerT); sheetEl.classList.add('near-corner');      // finger on the window: reveal the grip
}
function moveGesture(e) {
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const pts = [...touches.values()].slice(0, 2); if (pts.length !== gest.n) return startGesture(e);
  const c = centroid(pts); let s = gest.s0;
  if (gest.n === 1) { if (snapped('sheet') && Math.hypot(c.x - gest.c0.x, c.y - gest.c0.y) > 24) unsnap('sheet'); if (!snapped('sheet')) snapHover(c.x, c.y); }
  if (gest.n > 1 && gest.d0 > 10) { const raw = gest.s0 * Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) / gest.d0; s = raw < .45 ? .45 - (.45 - raw) * .25 : raw > 2.2 ? 2.2 + (raw - 2.2) * .25 : raw; }
  const px = (gest.c0.x - gest.x0) / gest.s0, py = (gest.c0.y - gest.y0) / gest.s0;
  sheet.s = s; sheet.dragTo(c.x - px * s, c.y - py * s, e.timeStamp);
}
function endGesture(e, all) {
  if (all) touches.clear(); else touches.delete(e.pointerId);
  if (touches.size) return startGesture(e);
  const v = sheet.velocity(e.timeStamp); gest = null;
  { const z = all ? null : takeSnapHint(); if (all) takeSnapHint(); if (z) { snapTo('sheet', z); return; } }
  if (sheet.s < .45 || sheet.s > 2.2) sheet.ts = clamp(sheet.s, .45, 2.2);
  sheet.release(v.x, v.y); setTimeout(() => sizeCanvases(), 60);
  cornerT = setTimeout(() => sheetEl.classList.remove('near-corner'), 1600);
}
sheetEl.addEventListener('pointermove', e => {
  if (ink && e.pointerId === ink.id) { ink.lx = e.clientX; ink.ly = e.clientY; }
  if (zpinch && zpinch.pts.has(e.pointerId)) return movePinch(e);
  if (zpan && e.pointerId === zpan.id) return movePan(e);
  if (ink && e.pointerId === ink.id) return moveInk(e);
  if (touches.has(e.pointerId) && gest) return moveGesture(e);
  if (e.pointerType !== 'touch' && !e.buttons) { const r = paper.getBoundingClientRect(), q = toLocal(e, r, r.width / PW); sheetEl.classList.toggle('near-corner', PW - q.x < 90 && PH - q.y < 90); }
  if (e.pointerType !== 'touch' && !e.buttons && !e.target.closest('.grip, .title, .lights, .resize, .selmenu') && !sheetEl.classList.contains('collapsed')) showCursor(e);
  else cursorEl.classList.remove('on');
}, { passive: true });
const upHandler = e => {
  if (tapDown && tapDown.id === e.pointerId) { if (e.type === 'pointerup' && e.timeStamp - tapDown.t < 260 && Math.hypot(e.clientX - tapDown.x, e.clientY - tapDown.y) < 10) lastTap = { t: e.timeStamp, x: e.clientX, y: e.clientY }; tapDown = null; }
  if (zpinch && zpinch.pts.has(e.pointerId)) return endPinch(e);
  if (zpan && e.pointerId === zpan.id) { const p = zpan; zpan = null; if (overscrolled()) settleView(); else if (e.timeStamp - p.t < 120) glide(p.vx, p.vy, p.k); return; }
  if (ink && e.pointerId === ink.id) { if (e.pointerType === 'pen') lastPen = e.timeStamp; return endInk(); }
  if (touches.has(e.pointerId)) endGesture(e);
};
sheetEl.addEventListener('pointerup', upHandler); sheetEl.addEventListener('pointercancel', upHandler);
for (const ty of ['pointerup', 'pointercancel']) addEventListener(ty, e => { if (!sheetEl.contains(e.target)) upHandler(e); }, true);
sheetEl.addEventListener('lostpointercapture', e => { if ((ink && ink.id === e.pointerId) || touches.has(e.pointerId) || (zpan && zpan.id === e.pointerId) || (zpinch && zpinch.pts.has(e.pointerId))) upHandler(e); });
let cornerT = 0;
sheetEl.addEventListener('pointerleave', () => { cursorEl.classList.remove('on'); if (!sheetEl.classList.contains('resizing')) sheetEl.classList.remove('near-corner'); });
function showCursor(e) {
  const r = paper.getBoundingClientRect(), k = r.width / PW, q = toLocal(e, r, k);
  let d, bg = 'transparent';
  if (tool === 'eraser') d = sizeFor('eraser') * 2;
  else if (tool === 'lasso') d = 10;
  else if (tool === 'laser') { d = 10; bg = inkColor(TOOLS.laser.color); }
  else { d = tool === 'hl' ? sizeFor('hl') : Math.max(5, sizeFor(tool) * 2.2); bg = inkColor(TOOLS[tool].color); }
  d *= Z; cursorEl.style.width = cursorEl.style.height = d + 'px';
  cursorEl.style.transform = `translate(${(q.x - zx) * Z - d / 2}px,${(q.y - zy) * Z - d / 2}px)`;
  cursorEl.style.background = bg;
  cursorEl.classList.add('on');
}
addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (emojiOpen) return closeEmojiPop(); if (!moodsEl.hidden) return toggleMoodRow(false); if (popKind) return closeToolPop(); if (sel) return clearSel(); if (popApp) return closePop(); if (ctxState) return closeCtx(); if (viewer.open) return viewer.full ? setViewerMode('normal') : closeViewer(); if (fullKey) return exitFull(); }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (ctxState) closeCtx(true); openCtx(current, ctxFor(current), $('#noteChip')); return showSave(current, ctxFor(current)); }
  if (e.target.closest('input, textarea')) return;
  if (e.code === 'Space') { spaceDown = true; sheetEl.style.cursor = 'grab'; e.preventDefault(); }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
});
addEventListener('keyup', e => { if (e.code === 'Space') { spaceDown = false; sheetEl.style.cursor = ''; } });

(() => {
  const h = $('#resize'); let id = null, s0;
  const rubber = (v, lo, hi) => v < lo ? lo - (lo - v) * .3 : v > hi ? hi + (v - hi) * .3 : v;
  h.addEventListener('pointerdown', e => {
    if (id !== null) return; e.stopPropagation(); e.preventDefault();
    if (fullKey === 'canvas') exitFull(true);
    canvas75 = false; syncRail();
    id = e.pointerId; try { h.setPointerCapture(id); } catch (_) {}
    cancelAnimationFrame(sizeAnim);
    s0 = { w: PW, h: PH, x: e.clientX, y: e.clientY, s: sheet.s, bx: sheet.x, by: sheet.y, ratio: snap.ratio, rows: { ...snap.rows } };
    sheetEl.classList.add('resizing', 'userresize'); document.body.classList.add('inking');
  });
  h.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    if (snapped('sheet')) return snapResize('sheet', e.clientX - s0.x, e.clientY - s0.y, s0);
    // the corner follows the finger and the opposite side moves the same amount the other way: the centre stays put
    const m = centredMax(s0), w = rubber(s0.w + 2 * (e.clientX - s0.x) / s0.s, MIN_W, m.w), hh = rubber(s0.h + 2 * (e.clientY - s0.y) / s0.s, MIN_H, m.h);
    setSize(w, hh); sheet.place(s0.bx - (w - s0.w) * s0.s / 2, s0.by - (hh - s0.h) * s0.s / 2);
  });
  const end = e => {
    if (e.pointerId !== id) return; id = null; document.body.classList.remove('inking');
    if (snapped('sheet')) { sheetEl.classList.remove('userresize'); sizeCanvases(true); return; }
    const m = centredMax(s0), tw = clamp(PW, MIN_W, m.w), th = clamp(PH, MIN_H, m.h);
    sheet.springTo(s0.bx - (tw - s0.w) * s0.s / 2, s0.by - (th - s0.h) * s0.s / 2, null, 190, 27);
    animateSize(tw, th, () => { home = computeHome(); sheetEl.classList.remove('userresize'); });
  };
  h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
  for (const ty of ['pointerup', 'pointercancel']) addEventListener(ty, e => { if (e.target !== h) end(e); }, true);
  h.tabIndex = 0;
  h.addEventListener('keydown', e => {
    const d = e.shiftKey ? 60 : 20, m = maxSize();
    const mv = { ArrowRight: [d, 0], ArrowLeft: [-d, 0], ArrowDown: [0, d], ArrowUp: [0, -d] }[e.key]; if (!mv) return;
    e.preventDefault(); animateSize(clamp(PW + mv[0], MIN_W, m.w), clamp(PH + mv[1], MIN_H, m.h));
  });
})();

// names are read-only until you double-tap them
function dblTapRename(input) {
  let last = 0, lx = 0, ly = 0;
  const start = () => { input.readOnly = false; input.focus(); input.select(); };
  input.addEventListener('pointerdown', e => { if (input.readOnly) e.preventDefault(); });
  input.addEventListener('mousedown', e => { if (input.readOnly) e.preventDefault(); });
  input.addEventListener('pointerup', input._tap = e => {
    if (!input.readOnly) return;
    if (e.timeStamp - last < 380 && Math.hypot(e.clientX - lx, e.clientY - ly) < 24) { last = 0; start(); }
    else { last = e.timeStamp; lx = e.clientX; ly = e.clientY; }
  });
  input.addEventListener('keydown', e => {
    if (input.readOnly) { if (e.key === 'Enter') { e.preventDefault(); start(); } return; }
    if (e.key === 'Enter' || e.key === 'Escape') input.blur();
  });
  input.addEventListener('blur', () => { input.readOnly = true; input.setSelectionRange(0, 0); });
}
const titleIn = $('#noteTitle');
titleIn.addEventListener('input', () => renameFile(current, titleIn.value));
dblTapRename(titleIn);
function renameFile(f, v) {
  ghosts.filter(g => g.f === f).forEach(g => { const i = g.el.querySelector('.g-noteTitle, .g-pTitle'); if (i) i.value = v; });
  const was = f.name; f.name = v.trim() || (f.kind === 'folder' ? 'New folder' : 'Untitled'); if (f.name !== was && f.kind !== 'folder') touched(f);
  document.querySelectorAll(`.item[data-id="${f.id}"] .label`).forEach(l => l.innerHTML = labelHTML(f));
  if (f === current && document.activeElement !== titleIn) titleIn.value = f.name;
  if (f === current) syncNoteChip();
  renderToday();
}

/* ---------- dock: tools, colours, sizes, options ---------- */
const dock = $('#dock'), toolPill = $('#toolPill'), swatches = $('#swatches'), sizesEl = $('#sizes'), toolPop = $('#toolPop');
toolPop.addEventListener('click', e => {
  const l = e.target.closest('.lgrow'); if (l) { setLang(l.dataset.l); renderToolPop(); setTimeout(() => { if (popKind === 'lang') closeToolPop(); }, 450); return; }
  const sp = e.target.closest('[data-split]'); if (sp) { const n = +sp.dataset.split; closeToolPop(); if (!n) return exitFull(); return openSplit(n); }
  const rb2 = e.target.closest('[data-rby]'); if (rb2) {
    if (rb2.dataset.rby === recentBy) return; recentBy = rb2.dataset.rby;
    const l0 = toolPop.querySelector('.rlist2'); toolPop.innerHTML = recentHTML(); placeToolPop();
    const l1 = toolPop.querySelector('.rlist2'); if (l1 && !reduceMotion) l1.animate([{ opacity: 0, transform: `translateX(${recentBy === 'added' ? 18 : -18}px)` }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.9,.3,1)' });
    return;
  }
  const rr = e.target.closest('.rrow'); if (rr && peekJustEnded) return;
  if (rr) { const f = [...walk(root)].find(x => x.id === rr.dataset.id); const kind = popKind; closeToolPop(); if (!f) return; if (kind === 'pick' && split) return setPaneFile(pickPane, f); if (split) { const i = split.panes.findIndex(p => p.f === f); if (i >= 0) return activatePane(i); return setPaneFile(split.live, f); } openAnywhere(f); return; }
});
const selBox = $('#selBox'), selMenu = $('#selMenu');
let customColor = '#7a4dd8';
function renderSwatches() {
  swatches.innerHTML = '';
  [...INKS, customColor].forEach(c => {
    const b = document.createElement('button'); b.className = 'sw'; b.dataset.c = c; b.style.setProperty('--c', c[0] === '#' ? c : `var(--ink-${c})`);
    b.innerHTML = '<i></i>'; b.setAttribute('aria-label', colorName(c)); b.title = colorName(c);
    b.addEventListener('click', () => pickColor(c));
    swatches.append(b);
  });
  const add = document.createElement('button'); add.className = 'sw add'; add.innerHTML = '<i></i>'; add.setAttribute('aria-label', 'More colours'); add.title = 'More colours';
  add.addEventListener('click', () => popKind === 'colors' ? closeToolPop() : openToolPop('colors', add)); swatches.append(add);
}
function pickColor(c) {
  const t = inkTool(tool) || tool === 'laser' ? tool : 'pen';
  TOOLS[t].color = c; rememberColor(c); if (t !== tool) setTool(t); syncDock(); if (popKind && popKind !== 'colors') renderToolPop();
}
function setTool(t) { if (t !== 'lasso') clearSel(); tool = t; syncDock(); }
const SIZE_RANGE = { pen: [.6, 8], pencil: [.6, 8], hl: [4, 40], eraser: [4, 50], text: [10, 72] };
const bubble = document.createElement('div'); bubble.id = 'sizeBubble'; bubble.className = 'glass'; bubble.hidden = true; document.body.append(bubble);
function showBubble(btn, t) {
  const v = sizeFor(t), [lo, hi] = SIZE_RANGE[t], d = 6 + (v - lo) / (hi - lo) * 30, c = TOOLS[t].color ? inkColor(TOOLS[t].color) : 'var(--ink-3)';
  bubble.innerHTML = `<i style="width:${d.toFixed(1)}px;height:${d.toFixed(1)}px;background:${t === 'eraser' ? 'transparent' : c};${t === 'eraser' ? 'border:1.5px dashed var(--ink-2)' : ''}${t === 'hl' ? ';opacity:.45;border-radius:4px' : ''}"></i><b>${v.toFixed(1)} pt</b>`;
  if (bubble.hidden) { bubble.hidden = false; bubble.animate([{ opacity: 0, transform: 'translateY(6px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.32,.72,0,1)' }); }
  const r = btn.getBoundingClientRect(); bubble.style.left = (r.left + r.width / 2 - bubble.offsetWidth / 2) + 'px'; bubble.style.top = (r.top - bubble.offsetHeight - 12) + 'px';
}
function hideBubble() { if (bubble.hidden) return; bubble.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(4px) scale(.94)' }], { duration: 180 }).onfinish = () => { bubble.hidden = true; }; }
// press a pen and slide up (thicker) or down (thinner); a plain tap still selects it or opens its options
document.querySelectorAll('.tb[data-tool]').forEach(b => b.addEventListener('pointerdown', e => {
  const t = b.dataset.tool, T = TOOLS[t]; if (!T.sizes) return;
  const x0 = e.clientX, y0 = e.clientY, s0 = sizeFor(t), [lo, hi] = SIZE_RANGE[t]; let on = false;
  const mv = ev => {
    if (ev.pointerId !== e.pointerId) return;
    const dy = y0 - ev.clientY, dx = ev.clientX - x0, d = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
    if (!on && Math.abs(d) < 7) return;
    if (!on) { on = true; if (tool !== t) setTool(t); closeToolPop(); }
    T.sizes[T.si] = +clamp(s0 + d * (hi - lo) / 150, lo, hi).toFixed(1); showBubble(b, t); syncMini();
  };
  const up = ev => { if (ev.pointerId !== e.pointerId) return; removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); if (on) { b._dragEnd = performance.now(); setTimeout(hideBubble, 350); } };
  addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}));
document.querySelectorAll('.tb[data-tool]').forEach(b => b.addEventListener('click', () => {
  if (performance.now() - (b._dragEnd || 0) < 350) return;      // that was a thickness drag, not a tap
  const t = b.dataset.tool;
  if (tool === t) { popKind === t ? closeToolPop() : openToolPop(t, b); return; }   // tap the active tool again for its options
  closeToolPop(); setTool(t);
}));
function syncDock(instant) {
  document.querySelectorAll('.tb[data-tool]').forEach(b => {
    const t = b.dataset.tool, on = t === tool; b.setAttribute('aria-pressed', String(on));
    const c = TOOLS[t].color; b.style.setProperty('--c', c ? inkColor(c) : 'transparent');
    if (on) slidePill(toolPill, b, instant);
  });
  const T = TOOLS[tool];
  swatches.classList.toggle('off', !T.color);
  swatches.querySelectorAll('.sw[data-c]').forEach(b => b.setAttribute('aria-pressed', String(!!T.color && b.dataset.c === T.color)));
  sizesEl.classList.toggle('off', !T.sizes);
  const sz = (T.sizes || TOOLS.pen.sizes), max = Math.max(...sz);
  sizesEl.querySelectorAll('.szb').forEach((b, i) => {
    b.setAttribute('aria-pressed', String(!!T.sizes && i === T.si)); b.setAttribute('aria-label', `Thickness ${sz[i].toFixed(1)}`);
    const d = 4 + Math.sqrt(sz[i] / max) * 9; b.firstChild.style.width = b.firstChild.style.height = d.toFixed(1) + 'px';
  });
  syncMini();
}
function syncMini() {
  const mb = $('#miniBtn'), b = $(`.tb[data-tool="${tool}"] svg`); if (!mb || !b) return;
  const c = TOOLS[tool].color; mb.style.setProperty('--c', c ? inkColor(c) : 'var(--ink-3)');
  mb.innerHTML = b.outerHTML; mb.style.setProperty('--c', c ? inkColor(c) : 'var(--ink)'); mb.setAttribute('aria-label', `${TOOLS[tool].label}. Tap to open the toolbar`);
}
function setDockMini(on) {
  closeToolPop(); if (on && popKind === 'recent') closeToolPop(); if (dock.classList.contains('circle') === on) return;
  if (!on && dockCorner) {        // opening from a corner: along the top or bottom edge next to it
    const side = dockCorner[0] === 't' ? 'top' : dockCorner[0] === 'm' ? (dockCorner[1] === 'l' ? 'left' : 'right') : 'bottom'; dockCorner = null;
    if (side !== dockSide) { dockSide = side; try { localStorage.setItem('olaa-dock-side', side); } catch (_) {} home = computeHome(); if (!fullKey && !W.canvas.min && !canvas75) sheet.springTo(home.x, home.y, home.s, 160, 20); }
  }
  morph($('#dock .win'), () => {
    dock.classList.toggle('circle', on);
    dock.classList.toggle('vert', !on && (dockSide === 'left' || dockSide === 'right'));      // opens along its side, centred
  }, { spr: SPR_OPEN });
  setTimeout(() => { if (!on) syncDock(true); if (relayoutDock) relayoutDock(true); else W.tools.body.settle(); }, 40);      // collapsed or open, it stays at the centre of its side
}
$('#dockMin').addEventListener('click', () => setDockMini(true));
$('#miniBtn').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDockMini(false); } });
sizesEl.querySelectorAll('.szb').forEach((b, i) => b.addEventListener('click', () => {
  const T = TOOLS[tool]; if (!T.sizes) return;
  if (T.si === i) return popKind === tool ? closeToolPop() : openToolPop(tool, $(`.tb[data-tool="${tool}"]`));
  T.si = i; syncDock(); if (popKind === tool) renderToolPop();
}));
$('#undo').addEventListener('click', undo); $('#redo').addEventListener('click', redo);
$('#pageBtn').addEventListener('click', e => popKind === 'paper' ? closeToolPop() : openToolPop('paper', e.currentTarget));
$('#finger').addEventListener('click', e => { fingerDraws = !fingerDraws; e.currentTarget.setAttribute('aria-pressed', String(fingerDraws)); toast(fingerDraws ? 'Finger draws. Use the handle to move the page.' : 'Finger moves the page. Pencil draws.'); });

// options popover
let popKind = null, popAnchor = null;
function openToolPop(kind, anchor) {
  popKind = kind; popAnchor = anchor; toolPop.hidden = false; renderToolPop();
  toolPop.getAnimations().forEach(a => a.cancel());
  toolPop.animate([{ opacity: 0, transform: 'translateY(8px) scale(.95)' }, { opacity: 1, transform: 'none' }], { duration: SPR_OPEN.d, easing: SPR_OPEN.e });
}
function placeToolPop() {
  const r = popAnchor.getBoundingClientRect(), w = toolPop.offsetWidth, h = toolPop.offsetHeight;
  if (dock.classList.contains('vert') && dock.contains(popAnchor)) {        // beside a vertical toolbar, not above it
    const d = $('#dock .win').getBoundingClientRect(), right = d.left < vw() / 2;
    const x = right ? d.right + 14 : d.left - w - 14, y = clamp(r.top + r.height / 2 - h / 2, 10, vh() - h - 10);
    toolPop.style.left = x + 'px'; toolPop.style.top = y + 'px'; toolPop.style.transformOrigin = `${right ? 0 : w}px ${r.top + r.height / 2 - y}px`; return;
  }
  const x = clamp(r.left + r.width / 2 - w / 2, 10, vw() - w - 10);
  const y = r.top - h - 14 > 10 ? r.top - h - 14 : Math.min(r.bottom + 14, vh() - h - 10);
  toolPop.style.left = x + 'px'; toolPop.style.top = y + 'px';
  toolPop.style.transformOrigin = `${r.left + r.width / 2 - x}px ${y < r.top ? h : 0}px`;
}
function closeToolPop() {
  if (!popKind) return; popKind = null;
  toolPop.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(6px) scale(.97)' }], { duration: 160 }).onfinish = () => { if (!popKind) toolPop.hidden = true; };
}
document.addEventListener('pointerdown', e => { if (popKind && !e.target.closest('#toolPop, #dock, #langBtn, #qSplit, .pchg')) closeToolPop(); });
const segH = (key, opts, val) => `<div class="seg" data-k="${key}">${opts.map(([v, l]) => `<button data-v="${v}" aria-pressed="${v === val}">${l}</button>`).join('')}</div>`;
const sliderH = (key, label, min, max, step, val, txt) => `<div class="ctl"><label for="r-${key}">${label}<b>${txt}</b></label><input id="r-${key}" type="range" data-k="${key}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
const switchH = (key, label, val) => `<div class="row2"><span>${label}</span><button class="switch" role="switch" data-k="${key}" aria-checked="${val}" aria-label="${label}"></button></div>`;
const pct = v => Math.round(v * 100) + '%';
function renderToolPop() {
  const k = popKind; if (!k) return;
  if (k === 'recent') { toolPop.innerHTML = recentHTML(); placeToolPop(); return; }
  if (k === 'split') { toolPop.innerHTML = splitHTML(); placeToolPop(); return; }
  if (k === 'pick') { toolPop.innerHTML = recentHTML().replace(esc(t('Recent files')), esc(t('Choose a file'))); placeToolPop(); return; }
  if (k === 'lang') {
    toolPop.innerHTML = langListHTML();
    placeToolPop();
    return;
  }
  let h = ''; const h0 = toolPop.hidden ? 0 : toolPop.offsetHeight, y0 = toolPop.offsetTop;
  if (k === 'colors') {
    const rc = recentColors.length ? `<h5 class="psub">${esc(t('Recent'))}</h5><div class="palette recentc">${recentColors.map(c => `<button style="--c:${c[0] === '#' ? c : `var(--ink-${c})`}" data-rc="${c}" aria-label="${esc(colorName(c))}" title="${esc(colorName(c))}" aria-pressed="${c === (TOOLS[tool].color || '')}"></button>`).join('')}</div><h5 class="psub">${esc(t('All colours'))}</h5>` : '';
    h = `<h4>Colours</h4>${rc}<div class="palette">${PALETTE.map(c => `<button style="--c:${c}" data-c="${c}" aria-label="${c}" title="${c}"></button>`).join('')}</div>
      <div class="row2"><span>Any colour</span><input type="color" id="nativeColor" value="${customColor}" aria-label="Any colour"></div>
      <p class="tip">Your pick fills the last colour slot in the toolbar.</p>`;
  } else if (k === 'paper') {
    h = `<h4>Page</h4><div class="papers">${[['dots', 'Dots'], ['lines', 'Lines'], ['grid', 'Grid'], ['blank', 'Blank']].map(([v, l]) => `<button data-p="${v}" aria-pressed="${current.paper === v}"><i class="pp-${v}"></i>${l}</button>`).join('')}</div><p class="tip">Applies to this note.</p>`;
  } else {
    const T = TOOLS[k], sz = sizeFor(k);
    h = `<h4>${T.label}${T.sizes ? `<small id="szTxt">${sz.toFixed(1)} pt</small>` : ''}</h4>`;
    if (k !== 'lasso') h += '<canvas class="pv" id="pv"></canvas>';
    if (k === 'pen') h += segH('type', [['fountain', 'Fountain'], ['ball', 'Ballpoint'], ['brush', 'Brush']], T.type);
    if (k === 'eraser') h += segH('mode', [['stroke', 'Whole stroke'], ['precise', 'Precise']], T.mode);
    if (k === 'text') h += `<div class="fontlist" role="radiogroup" aria-label="${esc(t('Typeface'))}">${FONTS.map(f => `<button data-font="${f.id}" role="radio" aria-checked="${f.id === T.font}" aria-pressed="${f.id === T.font}" style="font-family:${esc(f.css)}">${esc(f.name)}${f.own ? '<small>' + esc(t('Imported')) + '</small>' : ''}</button>`).join('')}</div>
      <button class="ghost" id="importFont">${esc(t('Import a font…'))}</button>`;
    if (T.sizes) { const [lo, hi] = SIZE_RANGE[k]; h += sliderH('size', k === 'text' ? t('Size') : 'Thickness', lo, hi, k === 'text' ? 1 : .1, sz, sz.toFixed(k === 'text' ? 0 : 1)); }
    if (k === 'text') h += `<p class="tip">${esc(t('Tap the page to type. Tap a piece of text to edit it. Imported fonts: TTF, OTF, WOFF or WOFF2.'))}</p>`;
    if (k === 'hl') h += sliderH('opacity', 'Opacity', .1, .7, .01, T.opacity, pct(T.opacity));
    if ('smooth' in T) h += sliderH('smooth', 'Stroke smoothing', 0, 1, .05, T.smooth, pct(T.smooth));
    if ('pressure' in T) h += switchH('pressure', 'Pressure sensitivity', T.pressure);
    if (k === 'hl') h += switchH('straight', 'Straight lines only', T.straight) + '<p class="tip">Hold still at the end of a stroke to straighten it.</p>';
    if (k === 'shape') h += switchH('fill', 'Fill closed shapes', T.fill) + '<p class="tip">Draw a line, circle, triangle or rectangle. It snaps to a clean shape when you lift.</p>';
    if (k === 'pen' || k === 'pencil') h += switchH('holdShape', 'Draw and hold to make a shape', prefs.holdShape) + '<p class="tip">Draw a line, circle, triangle or rectangle, then keep the Pencil still for half a second. It snaps to a clean shape.</p>';
    if (k === 'eraser') h += switchH('hlOnly', 'Erase highlighter only', T.hlOnly) + '<button class="ghost danger" id="clearPage">Clear page</button>';
    if (k === 'lasso') h += '<p class="tip">Draw a loop around strokes to select them. Drag inside the selection to move it. The menu above it recolours, duplicates or deletes.</p><button class="ghost" id="selAll">Select everything</button>';
    if (k === 'laser') h += '<p class="tip">Point at things while you explain. The trail fades on its own and is never saved. Pick its colour in the toolbar.</p>';
  }
  toolPop.innerHTML = h;
  wirePop(); drawPreview(); placeToolPop();
  const h1 = toolPop.offsetHeight; if (h0 && Math.abs(h1 - h0) > 2 && !reduceMotion) toolPop.animate([{ height: h0 + 'px', transform: `translateY(${y0 - toolPop.offsetTop}px)` }, { height: h1 + 'px', transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.32,.72,0,1)' });
}
function wirePop() {
  const k = popKind, T = TOOLS[k];
  toolPop.querySelectorAll('.seg').forEach(sg => sg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { T[sg.dataset.k] = b.dataset.v; renderToolPop(); syncDock(); })));
  toolPop.querySelectorAll('input[type=range]').forEach(r => {
    const set = live => {
      const v = +r.value, key = r.dataset.k;
      if (live) { if (key === 'size') T.sizes[T.si] = v; else T[key] = v; }
      r.style.setProperty('--p', ((v - r.min) / (r.max - r.min) * 100) + '%');
      r.previousElementSibling.querySelector('b').textContent = key === 'size' ? v.toFixed(1) : pct(v);
      if (key === 'size') $('#szTxt').textContent = v.toFixed(1) + ' pt';
      if (live) { drawPreview(); syncDock(); }
    };
    r.addEventListener('input', () => set(true)); set(false);
  });
  toolPop.querySelectorAll('.switch').forEach(sw => sw.addEventListener('click', () => {
    const key = sw.dataset.k, v = sw.getAttribute('aria-checked') !== 'true';
    if (key === 'holdShape') prefs.holdShape = v; else T[key] = v;
    sw.setAttribute('aria-checked', String(v)); drawPreview();
  }));
  const cp = $('#clearPage'); if (cp) cp.addEventListener('click', () => { closeToolPop(); clearPage(); });
  const sa = $('#selAll'); if (sa) sa.addEventListener('click', () => {
    closeToolPop(); if (!current.strokes.length) return toast('This page is empty');
    sel = { strokes: current.strokes.slice(), dx: 0, dy: 0 }; redrawBase(); updateSelUI(); scheduleLive();
  });
  if (k === 'colors') {
    toolPop.querySelectorAll('.palette button[data-c]').forEach(b => b.addEventListener('click', () => setCustom(b.dataset.c)));
    toolPop.querySelectorAll('[data-rc]').forEach(b => b.addEventListener('click', () => { const c = b.dataset.rc; c[0] === '#' ? setCustom(c) : (pickColor(c), closeToolPop()); }));
    const nc = $('#nativeColor'); nc.addEventListener('input', () => setCustom(nc.value, true));
  }
  if (k === 'text') {
    toolPop.querySelectorAll('[data-font]').forEach(b => b.addEventListener('click', () => { T.font = b.dataset.font; try { localStorage.setItem('olaa-font', T.font); } catch (_) {} renderToolPop(); }));
    $('#importFont').addEventListener('click', () => fontInput.click());
  }
  if (k === 'paper') toolPop.querySelectorAll('.papers button').forEach(b => b.addEventListener('click', () => { setPaper(b.dataset.p); renderToolPop(); }));
}
function setCustom(c, keepOpen) { customColor = c; renderSwatches(); pickColor(c); if (!keepOpen) closeToolPop(); }
function drawPreview() {
  const c = $('#pv'); if (!c || !popKind || !TOOLS[popKind]) return; const w = c.clientWidth || 268, h = 64; c.width = w * 2; c.height = h * 2;
  const x = c.getContext('2d'); x.scale(2, 2);
  const k = popKind, T = TOOLS[k], pts = [];
  for (let i = 0; i <= 80; i++) { const t = i / 80; pts.push({ x: 22 + t * (w - 44), y: h / 2 + Math.sin(t * Math.PI * 2) * 13, p: .2 + .75 * Math.sin(t * Math.PI) }); }
  if (k === 'eraser') { const r = Math.min(sizeFor('eraser'), 28); x.strokeStyle = themeColor('--ink-2'); x.setLineDash([4, 4]); x.lineWidth = 1.2; x.beginPath(); x.arc(w / 2, h / 2, r, 0, 7); x.stroke(); return; }
  if (k === 'laser') return drawLaser(x, pts, T.color, 1);
  if (k === 'text') { x.font = `${Math.min(sizeFor('text'), 40)}px ${fontCss(T.font)}`; x.fillStyle = inkColor(T.color); x.textBaseline = 'middle'; x.textAlign = 'center'; x.fillText(t('Light leaks, slow mornings'), w / 2, h / 2, w - 20); return; }
  const s = { tool: k, type: T.type, color: T.color, size: sizeFor(k), pr: T.pressure !== false, op: T.opacity, fill: T.fill, pts };
  if (k === 'hl' && T.straight) { s.pts = densify([pts[0], pts[pts.length - 1]], false, .5); s.flat = true; }
  if (k === 'shape') { s.pts = []; for (let i = 0; i <= 64; i++) { const t = i / 64 * Math.PI * 2; s.pts.push({ x: w / 2 + Math.cos(t) * 50, y: h / 2 + Math.sin(t) * 20, p: .5 }); } s.closed = s.shaped = true; }
  drawStroke(x, s);
}

// selection menu
selMenu.innerHTML = INKS.map(c => `<button class="sw" data-c="${c}" style="--c:var(--ink-${c})" aria-label="Recolour ${INK_NAMES[c]}" title="${INK_NAMES[c]}"><i></i></button>`).join('')
  + '<span class="sep"></span><button class="txt" data-a="dup">Duplicate</button><button class="txt danger" data-a="del">Delete</button>';
selMenu.addEventListener('pointerdown', e => e.stopPropagation());
selMenu.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !sel) return;
  if (b.dataset.c) { const c = b.dataset.c; replaceSel(s => ({ ...s, color: c })); }
  else if (b.dataset.a === 'dup') { const before = current.strokes.slice(), copies = sel.strokes.map(s => shifted(s, 24, 24)); current.strokes.push(...copies); commit(before); sel.strokes = copies; }
  else if (b.dataset.a === 'del') { const before = current.strokes.slice(), gone = new Set(sel.strokes), t = performance.now(); current.strokes = current.strokes.filter(s => !gone.has(s)); sel.strokes.forEach(s => fading.push({ s: shifted(s, sel.dx, sel.dy), t })); commit(before); sel = null; }
  else if (b.dataset.a === 'done') return clearSel();
  redrawBase(); updateSelUI(); scheduleLive(); noteChanged();
});
function updateSelUI(moving) {
  if (!sel) { selBox.hidden = selMenu.hidden = true; return; }
  const b0 = selBounds(), b = { x: (b0.x - zx) * Z, y: (b0.y - zy) * Z, w: b0.w * Z, h: b0.h * Z }; selBox.hidden = false;
  Object.assign(selBox.style, { transform: `translate(${(b.x - 6).toFixed(1)}px,${(b.y - 6).toFixed(1)}px)`, width: b.w + 12 + 'px', height: b.h + 12 + 'px' });
  if (moving) return;
  const wasHidden = selMenu.hidden; selMenu.hidden = false;
  const mw = selMenu.offsetWidth, mh = selMenu.offsetHeight;
  const mx = clamp(b.x + b.w / 2 - mw / 2, 8, PW - mw - 8), my = b.y - mh - 16 > 8 ? b.y - mh - 16 : Math.min(b.y + b.h + 16, PH - mh - 8);
  selMenu.style.transform = `translate(${mx.toFixed(1)}px,${my.toFixed(1)}px)`;
  if (wasHidden) selMenu.animate([{ opacity: 0, scale: '.9' }, { opacity: 1, scale: '1' }], { duration: SPR_OPEN.d, easing: SPR_OPEN.e });
}
renderSwatches();

/* ---------- light / dark ---------- */
const themeTg = $('#themeTg');
const isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
function syncThemeTg() { const d = isDark(); themeTg.setAttribute('aria-checked', String(d)); themeTg.title = d ? t('Switch to light mode') : t('Switch to dark mode'); }
try { const saved = localStorage.getItem('olaa-theme'); if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved; } catch (_) {}
syncThemeTg();
themeTg.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  const apply = () => { document.documentElement.dataset.theme = next; syncThemeTg(); };
  try { localStorage.setItem('olaa-theme', next); } catch (_) {}
  // crossfade every colour, plus a soft wash spreading from the button; nothing blocks your taps meanwhile
  const r = themeTg.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  if (reduceMotion) return apply();
  document.body.classList.add('theming'); apply(); setTimeout(() => document.body.classList.remove('theming'), 650);
  themeTg.querySelector('.knob').animate([{ transform: 'rotate(-90deg) scale(.6)' }, { transform: 'none' }], { duration: SPR.d, easing: SPR.e });
  const d = document.createElement('div'); d.className = 'ripple'; d.style.left = cx + 'px'; d.style.top = cy + 'px';
  d.style.background = `radial-gradient(closest-side, ${getComputedStyle(document.documentElement).getPropertyValue('--bg')}, transparent)`; document.body.append(d);
  d.animate([{ transform: 'scale(.3)', opacity: .9 }, { transform: `scale(${Math.hypot(vw(), vh()) / 14})`, opacity: 0 }], { duration: 900, easing: 'cubic-bezier(.32,.72,0,1)' }).onfinish = () => d.remove();
});

/* ---------- floating files ---------- */
const filesLayer = $('#files');
const COL_W = 92; const listTop = () => 96 + (dockSide === 'top' ? 68 : 0);      // file columns start below the top bar (and the toolbar when it is at the top)
function area() {      // files (everything that isn't a folder): columns on the right
  const W = vw(), H = vh();
  if (W >= 760) { const w = COL_W * (H > W ? 1 : 2) + 8, r = dockSide === 'right' ? 76 : 0, b = dockSide === 'bottom' ? 74 : 0; return { x: W - w - 10 - r, y: listTop(), w, h: H - listTop() - 12 - b, side: 'right' }; }      // portrait: one column, so the note gets more room
  const b = dockSide === 'bottom' ? 78 : 0; return { x: 10, y: H - 236 - b, w: W - 20, h: 226, side: 'bottom' };      // phones: a grid above the toolbar
}
const icon = {
  plus: '<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  import: '<svg class="i" viewBox="0 0 24 24"><path d="M12 4v11"/><path d="M7.5 10.5L12 15l4.5-4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
  canvas: '<svg class="i" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="3"/><path d="M8 14c2-3 3 1 5-2s2 0 3-1"/></svg>',
  tools: '<svg class="i" viewBox="0 0 24 24"><path d="M4 20l1.2-4.4L15.8 5a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.4 18.8z"/></svg>',
  files: '<svg class="i" viewBox="0 0 24 24"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H10l2 2h5.5A2.5 2.5 0 0 1 20 9.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/></svg>',
  today: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg>',
};
function labelHTML(f) {
  const sub = f.kind === 'folder' ? `${f.children.length} item${f.children.length === 1 ? '' : 's'}` : f.kind === 'note' ? (f.draft ? 'Draft' : f.date) : f.kind === 'doc' ? f.size : f.kind === 'image' ? 'Image' : 'Text';
  return `${esc(f.name)}<small>${esc(sub)}</small>`;
}
function tileInner(f) { return (f.icon ? `${emoImg(f.icon, 40, 'ficon')}${f.kind === 'folder' ? `<span class="fcount">${f.children.length}</span>` : ''}${f.kind === 'note' ? '<b class="live"></b>' : ''}` : tileBase(f)) + (f.fav ? '<svg class="favb" viewBox="0 0 24 24" aria-label="Favourite"><path d="M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z"/></svg>' : ''); }
function tileBase(f) {
  switch (f.kind) {
    case 'folder': return `<div class="peek">${f.children.slice(0, 3).map((c, i) => `<i class="pk pk${i} pk-${c.kind}"${c.kind === 'image' ? ` style="background-image:url('${c.src}')"` : ''}></i>`).join('')}</div><div class="pocket"><span>${f.children.length}</span></div>`;
    case 'note': return `<div class="mini"><canvas data-note="${f.id}" width="92" height="68"></canvas></div><b class="live"></b>`;
    case 'image': return `<img src="${f.src}" alt="" draggable="false">`;
    case 'text': return `<div class="lines"><i></i><i></i><i></i><i></i></div><span class="ext">${esc((f.name.split('.').pop() || 'TXT').toUpperCase().slice(0, 4))}</span>`;
    default: return `<span class="ext big">${esc(f.ext)}</span>`;
  }
}
function repaintThumbs(f) { document.querySelectorAll(`canvas[data-note="${f.id}"]`).forEach(c => paintStrokes(c, f.strokes, 46, 34)); }
function updateCount() { const n = root.length; $('#fileCount').textContent = t('Files'); $('#qFiles').title = `Open all files (${n})`; }

const rootCtx = { parent: null, list: root, container: filesLayer, views: new Map(), bounds: () => ({ minX: -6, maxX: vw() - 74, minY: 0, maxY: vh() - 96 }), root: true };
function makeItem(f, ctx, x, y, extraClass = '') {
  const el = document.createElement('div'); el.className = `body item ${extraClass}`; el.dataset.id = f.id;
  const r = rng(parseInt(f.id.slice(1), 10) * 13 + 7);
  el.innerHTML = `<div class="bob" style="animation-duration:${(5 + r() * 3).toFixed(2)}s;animation-delay:-${(r() * 6).toFixed(2)}s"><div class="lift"><i class="plate"></i><div class="tile glass k-${f.kind}">${tileInner(f)}</div><div class="label">${labelHTML(f)}</div></div></div>`;
  ctx.container.append(el);
  if (f.kind === 'note') { paintStrokes(el.querySelector('canvas'), f.strokes, 46, 34); el.classList.toggle('current', f === current); }
  const b = new Body(el, { x, y, tiltK: .45, bounds: ctx.bounds, raise: !ctx.root, onRender: ctx.root ? null : bb => { f._pos = { x: bb.x, y: bb.y }; } });
  if (!ctx.root) b.noRubber = true;      // inside a folder, nothing holds the file back from the edge
  ctx.views.set(f.id, { el, b, f });
  let popped = false;
  draggable(b, el, {
    scale: ctx.root ? null : () => viewer.body.s,
    accept: e => { if (el.classList.contains('inrail')) return false; if (e.target.closest('.rn')) return false; if (ctx.root && filesState.piled) { togglePanel('files', 'collapse'); return false; } return true; },
    down: e => { pinTo(el, e); document.body.classList.add('file-drag'); if (ctx.root) liftItem(el); },
    up: () => document.body.classList.remove('file-drag'),
    tap: (e, t) => {
      if (selecting && ctx.root) return togglePick(f, el);
      const open = () => {
        if (ctx.root && fullKey === 'files') { if (f.kind !== 'note') return openViewer(f, el.querySelector('.tile')); exitFull(); return setTimeout(() => loadNote(f), 420); }      // folders and files open right here, over Files
        if (ctx.root && f === current && W.canvas.min) return restore('canvas'); ctx.root ? openViewer(f, el.querySelector('.tile')) : pushView(f);
      };
      if (!(t || e.target).closest('.label')) return open();
      if (labelTap.id === f.id && e.timeStamp - labelTap.t < 380) { clearTimeout(labelTap.timer); labelTap = {}; return renameInline(f, el); }
      clearTimeout(labelTap.timer); labelTap = { id: f.id, t: e.timeStamp, timer: setTimeout(() => { labelTap = {}; open(); }, 300) };
    },
    move: e => {
      if (popped) return;
      if (!ctx.root && viewer.open && wantsOut(e, b)) { popped = true; return popOutOfFolder(f, ctx, e, el); }
      if (!hoverRaf) hoverRaf = requestAnimationFrame(() => { hoverRaf = 0; if (!popped) hoverCheck(f, ctx); });      // once a frame, not on every pointer event
    },
    hold: () => openCtx(f, ctx, el),
    holdCancel: () => closeCtx(),
    end: () => {
      if (popped) return false;
      if (dropOn(f, ctx)) return false;
      if (ctx.grid || (ctx.root && fullKey === 'files')) {        // inside a folder: drop back into a tidy slot (reorders)
        const to = ctx.slotAt(ctx.views.get(f.id).b.x, ctx.views.get(f.id).b.y);
        ctx.list.splice(ctx.list.indexOf(f), 1); ctx.list.splice(to, 0, f); ctx.layout(); return false;
      }
    },
  });
  el.addEventListener('contextmenu', e => { e.preventDefault(); if (ctxState && ctxState.f === f) return; openCtx(f, ctx, el); });
  // in the left column files don't move: tap opens, press and hold shows the menu, swipe scrolls
  el.addEventListener('click', () => { if (!el.classList.contains('inrail')) return; if (railHeld) { railHeld = false; return; } if (selecting) return togglePick(f, el); if (f === current && W.canvas.min) return restore('canvas'); openViewer(f, el.querySelector('.tile')); });
  el.addEventListener('pointerdown', e => {
    if (!el.classList.contains('inrail')) return;
    railHeld = false; const sx = e.clientX, sy = e.clientY; let drag = null;
    const t = setTimeout(() => { railHeld = true; openCtx(f, rootCtx, el); }, 500);
    const done = ev => {
      clearTimeout(t); removeEventListener('pointermove', mv); removeEventListener('pointerup', done); removeEventListener('pointercancel', done);
      if (drag) { railHeld = true; endRailDrag(drag, f, ev); }      // railHeld: the click that follows must not open it a second time
    };
    // sideways out of the column: the file comes with your finger; a vertical swipe still scrolls the column
    const mv = ev => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (drag) return moveRailDrag(drag, ev);
      if (dx > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) { clearTimeout(t); closeCtx(true); drag = startRailDrag(el, ev); return; }
      if (Math.hypot(dx, dy) > 8) done();
    };
    addEventListener('pointermove', mv); addEventListener('pointerup', done); addEventListener('pointercancel', done);
  });
  return { el, b };
}

/* drag a file or folder out of the left Files column and let go over the workspace: it opens there */
function startRailDrag(el, ev) {
  const tile = el.querySelector('.tile'), r = tile.getBoundingClientRect(), g = tile.cloneNode(true);
  const sc = tile.querySelectorAll('canvas'), gc = g.querySelectorAll('canvas');
  gc.forEach((c, i) => { try { c.getContext('2d').drawImage(sc[i], 0, 0); } catch (_) {} });
  g.classList.add('raildrag'); g.style.left = r.left + 'px'; g.style.top = r.top + 'px'; g.style.width = r.width + 'px'; g.style.height = r.height + 'px';
  const badge = document.createElement('b'); badge.className = 'rd-open'; badge.textContent = t('Open'); g.append(badge);
  document.body.append(g); el.classList.add('dragging-out'); document.body.classList.add('rail-dragging');
  if (!reduceMotion) g.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }], { duration: 180, easing: 'ease-out', fill: 'forwards' });
  const d = { g, el, r, ox: ev.clientX - r.left, oy: ev.clientY - r.top, over: false };
  moveRailDrag(d, ev); return d;
}
function moveRailDrag(d, ev) {
  d.g.style.translate = `${ev.clientX - d.ox - d.r.left}px ${ev.clientY - d.oy - d.r.top}px`;
  const edge = $('#rail').getBoundingClientRect().right;
  const over = ev.clientX > edge + 16; if (over !== d.over) { d.over = over; d.g.classList.toggle('willopen', over); }
}
function endRailDrag(d, f, ev) {
  d.el.classList.remove('dragging-out'); document.body.classList.remove('rail-dragging');
  if (ev && ev.type === 'pointerup' && d.over) {
    if (f.kind === 'note') { if (f === current && W.canvas.min) restore('canvas'); else loadNote(f); }
    else openViewer(f, d.g);
    d.g.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.9)' }], { duration: 260, delay: 120, fill: 'forwards' }).onfinish = () => d.g.remove();
    return;
  }
  // not far enough: it flies back into the column
  d.g.animate([{ translate: d.g.style.translate, transform: 'scale(1.1)' }, { translate: '0px 0px', transform: 'scale(1)' }], { duration: SPR.d, easing: SPR.e, fill: 'forwards' }).onfinish = () => d.g.remove();
}

/* iPhone-style grouping: hold a file over another to make a folder, or over a folder to file it */
let hover = { id: null }, hoverRaf = 0;
const centerOf = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
function clearHover() { clearTimeout(hover.timer); if (hover.v) hover.v.el.classList.remove('near', 'merge', 'new', 'into'); if (hover.me) hover.me.classList.remove('merging'); hover = { id: null }; }
function hoverCheck(f, ctx) {
  const me = ctx.views.get(f.id); if (!me) return; const c = centerOf(me.el.querySelector('.tile'));
  let best = null, bd = 30;
  for (const [id, v] of ctx.views) { if (id === f.id) continue; const p = centerOf(v.el.querySelector('.tile')); const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = v; } }
  const id = best ? best.f.id : null;
  if (id === hover.id) return;
  clearHover(); if (!best) return;
  hover = { id, v: best, me: me.el, armed: false };
  best.el.classList.add('near');
  hover.timer = setTimeout(() => { hover.armed = true; best.el.classList.add('merge', best.f.kind === 'folder' ? 'into' : 'new'); me.el.classList.add('merging'); }, 650);
}
function dropOn(f, ctx) {
  const h = hover; clearHover();
  let target = h.armed && h.v && ctx.views.has(h.id) ? h.v.f : null;
  if (!target) return false;
  if (target.kind === 'folder') absorb(f, target, ctx); else groupIntoFolder(f, target, ctx);
  return true;
}
function flyInto(v, tx, ty) {
  active.delete(v.b);
  v.el.animate([{ transform: v.el.style.transform, opacity: 1 }, { transform: `translate3d(${tx}px,${ty}px,0) scale(.3)`, opacity: 0 }],
    { duration: 380, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).onfinish = () => v.el.remove();
}
function absorb(f, target, ctx) {
  const me = ctx.views.get(f.id), tv = ctx.views.get(target.id);
  flyInto(me, tv.b.x, tv.b.y); ctx.views.delete(f.id); ctx.list.splice(ctx.list.indexOf(f), 1); delete f._pos;
  target.children.push(f);
  setTimeout(() => refreshFolder(target), 280);
  if (ctx.grid) setTimeout(() => ctx.layout(), 200);
  toast(`Moved “${f.name}” into ${target.name}`); afterTreeChange();
}
function suggestName(a, b) {
  const k = new Set([a.kind, b.kind]);
  if (k.size === 1 && k.has('image')) return 'Photos';
  if (k.size === 1 && k.has('note')) return 'Notes';
  if ([...k].every(x => x === 'text' || x === 'doc')) return 'Documents';
  return 'New folder';
}
function groupIntoFolder(f, target, ctx) {
  const me = ctx.views.get(f.id), tv = ctx.views.get(target.id), x = tv.b.x, y = tv.b.y;
  const folder = mk.folder(suggestName(f, target), [target, f]);
  ctx.list.splice(ctx.list.indexOf(target), 1, folder); ctx.list.splice(ctx.list.indexOf(f), 1);
  delete f._pos; delete target._pos;
  flyInto(me, x, y); flyInto(tv, x, y); ctx.views.delete(f.id); ctx.views.delete(target.id);
  setTimeout(() => {
    const { el } = makeItem(folder, ctx, x, y, 'pop');
    if (ctx.root) { ctx.layout(); setTimeout(() => openViewer(folder, el.querySelector('.tile'), { rename: true }), 420); }
    else { toast(`Made “${folder.name}”`); ctx.layout(); }
  }, 200);
  afterTreeChange();
}
function afterTreeChange() {
  updateCount();
  if (viewer.open) { viewer.stack.forEach(refreshFolder); const top = viewer.stack[viewer.stack.length - 1]; $('#pSub').innerHTML = subtitle(top); }
}
function refreshFolder(f) {
  if (f.kind !== 'folder') return;
  document.querySelectorAll(`.item[data-id="${f.id}"]`).forEach(el => {
    el.querySelector('.tile').innerHTML = tileInner(f); el.querySelector('.label').innerHTML = labelHTML(f);
    el.classList.remove('gulp'); void el.offsetWidth; el.classList.add('gulp');
  });
}
function freeSpot(ctx, a) {
  const taken = [...ctx.views.values()].map(v => ({ x: v.b.x, y: v.b.y }));
  let best = null, bestD = -1;
  for (let i = 0; i < 80; i++) {
    const top = a.side === 'right' ? 8 : 30, p = { x: a.x + Math.random() * Math.max(1, a.w - 80), y: a.y + top + Math.random() * Math.max(1, a.h - top - 100) };
    const d = taken.reduce((m, t) => Math.min(m, Math.hypot(t.x - p.x, t.y - p.y)), 1e9);
    if (d > bestD) { best = p; bestD = d; } if (d > 130) break;
  }
  return best;
}
const orbs = [];
function makeOrb(kind, label, svg, x, y, onTap) {
  const el = document.createElement('div'); el.className = 'body item orb';
  el.innerHTML = `<div class="bob" style="animation-duration:${kind === 'new' ? 6.5 : 7.3}s"><div class="lift"><div class="tile glass" role="button" tabindex="0" aria-label="${label}">${svg}</div><div class="label">${label}</div></div></div>`;
  filesLayer.append(el);
  const b = new Body(el, { x, y, bounds: rootCtx.bounds }); b.pinned = true;   // buttons hold their place; files bounce off them
  draggable(b, el, { accept: () => { if (filesState.piled) { togglePanel('files', 'collapse'); return false; } return true; }, tap: onTap,
    down: e => { pinTo(el, e); document.body.classList.add('file-drag'); }, up: () => document.body.classList.remove('file-drag') });
  el.querySelector('.tile').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(); } });
  orbs.push({ el, b, kind }); return b;
}
let labelTap = {};
function renameInline(f, el) {
  const label = el.querySelector('.label');
  label.innerHTML = `<input class="rn" maxlength="40" aria-label="Rename ${esc(f.name)}" value="${esc(f.name)}">`; const isChip = el.id === 'noteChip';
  const inp = label.querySelector('input'); let done = false;
  const finish = keep => { if (done) return; done = true; if (keep) renameFile(f, inp.value); label.innerHTML = labelHTML(f); if (isChip) label.textContent = f.name; };
  inp.addEventListener('pointerdown', e => e.stopPropagation());
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') finish(true); if (e.key === 'Escape') finish(false); });
  inp.addEventListener('blur', () => finish(true));
  inp.focus(); inp.select();
}
// scale and tilt around the exact point you touched, so the file never slides out from under your finger
function pinTo(el, e) {
  for (const sel of ['.lift', '.tile']) {
    const n = el.querySelector(sel); if (!n) continue; const r = n.getBoundingClientRect();
    n.style.transformOrigin = `${clamp(e.clientX - r.left, 0, r.width).toFixed(1)}px ${clamp(e.clientY - r.top, 0, r.height).toFixed(1)}px`;
  }
}
const allFileBodies = () => root.map(f => rootCtx.views.get(f.id)).filter(Boolean).map(v => v.b);
function quickPos(id) { const r = $(`#${id}`).getBoundingClientRect(); return { x: r.left, y: r.bottom + 6 }; }


// newest first, by when each file was made
function dayLabel(ts) {
  const d = new Date(ts), now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return t('Today');
  if (d.toDateString() === y.toDateString()) return t('Yesterday');
  return new Intl.DateTimeFormat(langOf(LANG)[3], { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}
// every file, newest first, under the day it was made
let recentBy = 'edited';
function recentHTML() {
  const by = recentBy, when = f => by === 'edited' ? f.edited || 0 : f.added || 0;
  const all = [...walk(root)], list = all.filter(f => f.kind !== 'folder' && (by === 'added' || f.edited)).sort((a, b) => when(b) - when(a));
  const where = f => { const p = all.find(x => x.kind === 'folder' && x.children.includes(f)); return p ? p.name : t('Files'); };
  const glyph = f => f.icon ? emoImg(f.icon, 20) : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${kindIcon(f)}</svg>`;
  const time = ts => ts ? new Intl.DateTimeFormat(langOf(LANG)[3], { hour: '2-digit', minute: '2-digit' }).format(new Date(ts)) : '';
  let html = '', last = '';
  for (const f of list) {
    const ts = when(f), day = ts ? dayLabel(ts) : '—';
    if (day !== last) { html += `<h5 class="rday">${esc(day)}</h5>`; last = day; }
    const sub = by === 'edited' ? `${t('Edited')} ${time(ts)}${f.edits ? ' · ' + f.edits + ' ' + t(f.edits === 1 ? 'change' : 'changes') : ''}` : `${t('Added')} ${time(ts)}`;
    html += `<button class="rrow" data-id="${f.id}"><span class="rk">${glyph(f)}</span><span class="rt"><b>${esc(f.name)}</b><small>${esc(sub)} · ${esc(where(f))}</small></span></button>`;
  }
  if (!list.length) html = `<p class="rempty">${esc(t('Nothing edited yet. Files you change show up here.'))}</p>`;
  const seg = `<div class="seg rseg" role="radiogroup">${[['edited', 'Edited'], ['added', 'Added']].map(([v, l]) => `<button data-rby="${v}" role="radio" aria-pressed="${v === by}" aria-checked="${v === by}">${esc(t(l))}</button>`).join('')}</div>`;
  return `<h4>${esc(t('Recent files'))}<small>${list.length}</small></h4>${seg}<div class="rlist2">${html}</div>`;
}
function openAnywhere(f) {
  if (split) { const i = split.panes.findIndex(p => p.f === f); if (i >= 0) return activatePane(i); return setPaneFile(f.kind === 'note' ? split.live : split.panes.findIndex((p, j) => j !== split.live) , f); }
  if (f.kind === 'note') return loadNote(f);
  const v = rootCtx.views.get(f.id); openViewer(f, v ? v.el.querySelector('.tile') : $('#recentTb')); $('#recentTb').style.visibility = '';
}
// the note, the toolbar and the side windows share the screen; call this after any of them changes
function relayoutAll() {
  home = computeHome();
  if (!fullKey && !W.canvas.min && !canvas75) sheet.springTo(home.x, home.y, home.s, 160, 20);
  relayoutDock && relayoutDock(true);
}

/* ---------- 5. several files at full size, like iPad Stage Manager ----------
   The window in front is live. Windows behind it are exact copies of their file at the same size; touch one and it
   comes to the front (it gets the live page or viewer) while the one that was in front steps back. */
const ghosts = [], MAX_GHOSTS = 4;
function fileExists(f) { for (const x of walk(root)) if (x === f) return true; return false; }
function ghostClone(src) {
  const c = src.cloneNode(true);
  for (const el of [c, ...c.querySelectorAll('[id]')]) if (el.id) { el.classList.add('g-' + el.id); el.removeAttribute('id'); }
  const si = src.querySelectorAll('input'), ci = c.querySelectorAll('input'); ci.forEach((x, i) => { x.value = si[i] ? si[i].value : x.value; x.readOnly = true; x.tabIndex = -1; });
  c.querySelectorAll('button, [tabindex]').forEach(b => b.tabIndex = -1);
  const sc = src.querySelectorAll('canvas'), cc = c.querySelectorAll('canvas');
  cc.forEach((x, i) => { try { if (sc[i] && sc[i].width) x.getContext('2d').drawImage(sc[i], 0, 0); } catch (_) {} });
  c.classList.remove('front', 'dragging', 'near-corner', 'resizing', 'userresize', 'ctx');
  c.classList.add('bgwin'); c.setAttribute('role', 'button');
  return c;
}
function paintGhost(g) {
  if (g.kind !== 'note') return;
  const base = g.el.querySelector('.g-base'), live = g.el.querySelector('.g-live'); if (!base) return;
  if (live) live.getContext('2d').clearRect(0, 0, live.width, live.height);
  const x = base.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, base.width, base.height);
  x.setTransform(g.k, 0, 0, g.k, 0, 0); for (const st of g.f.strokes) drawStroke(x, st);
}
function stackGhosts() { ghosts.forEach((g, i) => { g.el.style.zIndex = 19 - (ghosts.length - 1 - i); }); }
function addGhost(g, src) {
  g.el.setAttribute('aria-label', `${g.f.name}. ${t('Tap to bring it to the front')}`);
  src.parentNode.insertBefore(g.el, src);
  g.b = new Body(g.el, { x: g.x, y: g.y, s: g.s, tiltK: 0, raise: false });
  draggable(g.b, g.el, { tap: e => { if (hitRed(g, e)) return removeGhost(g); focusGhost(g); } });
  g.el.addEventListener('pointerdown', () => { const i = ghosts.indexOf(g); if (i >= 0) { ghosts.splice(i, 1); ghosts.push(g); stackGhosts(); } }, true);
  ghosts.push(g); while (ghosts.length > MAX_GHOSTS) removeGhost(ghosts[0], true);
  stackGhosts(); paintGhost(g);
}
function hitRed(g, e) {
  const red = g.el.querySelector('.lights > *'); if (!red) return false;
  const r = red.getBoundingClientRect(); return e.clientX > r.left - 8 && e.clientX < r.right + 8 && e.clientY > r.top - 8 && e.clientY < r.bottom + 8;
}
function ghostCurrentNote(force) {
  const f = current; if (!f || !fileExists(f) || (!force && !f.strokes.length && f.draft)) return false;      // an empty draft isn't kept
  if (ghosts.some(g => g.f === f)) return false;
  const el = ghostClone(sheetEl);
  const g = { kind: 'note', f, el, x: sheet.x, y: sheet.y, s: sheet.s, w: PW, h: PH, k: canvasK };
  addGhost(g, sheetEl); return true;
}
function ghostViewer() {
  const f = viewer.stack[viewer.stack.length - 1]; if (!f || ghosts.some(g => g.f === f)) return false;
  const g = { kind: 'file', f, el: ghostClone(panelPos), x: viewer.body.x, y: viewer.body.y, s: viewer.body.s || 1 };
  addGhost(g, panelPos); return true;
}
function removeGhost(g, quick) {
  const i = ghosts.indexOf(g); if (i < 0) return; ghosts.splice(i, 1); active.delete(g.b);
  if (quick || reduceMotion) g.el.remove();
  else g.el.animate([{ opacity: 1 }, { opacity: 0, scale: '.94' }], { duration: 200, easing: 'ease-in' }).onfinish = () => g.el.remove();
  stackGhosts();
}
function focusGhost(g) {
  const at = { x: g.b.x, y: g.b.y, s: g.b.s, w: g.w, h: g.h };
  if (g.kind === 'note') { removeGhost(g, true); return loadNote(g.f, { at }); }
  const v = rootCtx.views.get(g.f.id);
  openViewer(g.f, v ? v.el.querySelector('.tile') : g.el, { at }); removeGhost(g, true);
}
function cascadeFrom(x, y, w, h) {
  let nx = x + 44, ny = y + 36;
  if (nx + w > vw() - 8) nx = Math.max(8, x - 44);
  if (ny + h > vh() - 8) ny = Math.max(8, y - 36);
  return { x: nx, y: ny };
}
new MutationObserver(() => { if (split) split.panes.forEach((p, i) => i !== split.live && paintPane(p)); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
new MutationObserver(() => ghosts.forEach(paintGhost)).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

/* ---------- layout ---------- */
let home = { x: 0, y: 0, s: 1 };
function computeHome() {
  // the note sits in the middle of the screen, between the folder column and the file columns
  const a = area(), W = vw(), H = vh(), top = 84 + (dockSide === 'top' ? 72 : 0), side = a.side === 'right', dockH = dockSide === 'bottom' ? 74 : 0;
  const lEdge = side ? folderArea().x + folderArea().w + 14 : 16, rEdge = side ? a.x - 14 : W - 16;
  const half = Math.max(120, Math.min(W / 2 - lEdge, rEdge - W / 2)), availW = half * 2, availH = (side ? H : a.y) - top - dockH - 16;
  const s = clamp(Math.min(availW / PW, availH / PH), .4, 1);
  return { x: W / 2 - PW * s / 2, y: top + Math.max(0, Math.min(H > W ? 24 : 1e9, (availH - PH * s) / 2)), s };
}
function settleNew(b) { if (railOn || fullKey === 'files') return rootCtx.layout(); fileTargets().forEach(t => t.b.springTo(t.x, t.y, null, t.b === b ? 170 : 200, t.b === b ? 20 : 24)); }      // a new item joins its column; the others make room
function folderArea() {      // folders: a column on the left
  const H = vh(), n = root.filter(f => f.kind === 'folder').length, rows = Math.max(1, Math.floor((H - listTop() - 12) / 104));
  return { x: 10 + (dockSide === 'left' ? 76 : 0), y: listTop(), w: (n > rows ? 2 : 1) * COL_W + 8, h: H - listTop() - 12 };
}
function rootGeo() { const a = area(), cols = Math.max(2, Math.floor((a.w - 8) / 88)); return { a, cols, colW: (a.w - 8) / cols, rowH: a.side === 'right' ? 104 : 96, y0: a.y + (a.side === 'right' ? 6 : 18) }; }
function fileTargets() {
  const g = rootGeo(), views = root.map(f => rootCtx.views.get(f.id)).filter(Boolean);
  if (g.a.side !== 'right') {      // narrow screens: one grid along the bottom, folders first
    const order = [...views.filter(v => v.f.kind === 'folder'), ...views.filter(v => v.f.kind !== 'folder')];
    return order.map((v, i) => ({ b: v.b, x: g.a.x + 4 + (i % g.cols) * g.colW + (g.colW - 80) / 2, y: g.y0 + Math.floor(i / g.cols) * g.rowH }));
  }
  const place = (list, a) => { const cols = Math.max(1, Math.round((a.w - 8) / COL_W)), colW = (a.w - 8) / cols;
    return list.map((v, i) => ({ b: v.b, x: a.x + 4 + (i % cols) * colW + (colW - 80) / 2, y: a.y + Math.floor(i / cols) * 104 })); };
  return [...place(views.filter(v => v.f.kind === 'folder'), folderArea()), ...place(views.filter(v => v.f.kind !== 'folder'), g.a)];
}
// files keep fixed slots: dragging one reorders it (or groups it); it never stays where you dropped it
rootCtx.grid = false;
rootCtx.layout = () => {
  if (railOn) return enterRail();
  if (fullKey === 'files') return fullGrid();
  if (filesState.piled) return;
};
// a new file flies from its button to the nearest free spot
rootCtx.slotAt = (x, y) => {
  if (fullKey === 'files') { const cols = Math.max(2, Math.floor((vw() - 48) / 104)), colW = (vw() - 48) / cols; return clamp(Math.max(0, Math.round((y - 164) / 120)) * cols + clamp(Math.round((x - 24 - (colW - 80) / 2) / colW), 0, cols - 1), 0, root.length - 1); }
  const g = rootGeo(), col = clamp(Math.round((x - g.a.x - 4 - (g.colW - 80) / 2) / g.colW), 0, g.cols - 1), row = Math.max(0, Math.round((y - g.y0) / g.rowH));
  return clamp(row * g.cols + col, 0, root.length - 1);
};
function filesHdrHome() { const a = area(); return { x: a.x + 6, y: a.side === 'right' ? a.y - 8 : a.y - 46 }; }

/* ---------- windows: minimize / collapse / full screen ---------- */
const LIGHT_SVG = {
  min: '<svg viewBox="0 0 12 12"><path d="M3 6h6"/></svg>',
  close: '<svg viewBox="0 0 12 12"><path d="M3.6 3.6l4.8 4.8M8.4 3.6L3.6 8.4"/></svg>',
  collapse: '<svg viewBox="0 0 12 12"><path d="M3 6h6"/></svg>',
  full: '<svg viewBox="0 0 12 12"><path d="M3 9V5.2L6.8 9z"/><path d="M9 3v3.8L5.2 3z"/></svg>',
};
const W_INFO = {
  today: { label: 'Today', icon: 'today' }, canvas: { label: 'Canvas', icon: 'canvas' },
  tools: { label: 'Tools', icon: 'tools', noFull: true }, files: { label: 'Files', icon: 'files' }, viewer: { label: 'File', close: true },
};
document.querySelectorAll('.lights[data-panel]').forEach(l => {
  const k = l.dataset.panel, info = W_INFO[k];
  l.innerHTML = `${k === 'today' ? '' : `<button class="lt lt-r" data-act="min" aria-label="Close" title="Close">${LIGHT_SVG.close}</button>`}
    <button class="lt lt-y" data-act="collapse" aria-label="Shrink to 65%" title="Shrink to 65%">${LIGHT_SVG.collapse}</button>
    <button class="lt lt-g" data-act="full" aria-label="Full screen" title="${info.noFull ? 'This window has a fixed size' : 'Full screen'}" ${info.noFull ? 'disabled' : ''}>${LIGHT_SVG.full}</button>`;
  l.addEventListener('pointerdown', e => e.stopPropagation());
  l.querySelectorAll('.lt').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); togglePanel(k, b.dataset.act); }));
});
let fullKey = null; const saved = {};
const filesState = { piled: false, min: false };
let W; // window registry, filled at boot
function syncCollapseFull() {
  const b = $('#collapseFull'), on = fullKey === 'canvas' || (viewer.open && viewer.full);
  if (on && b.hidden && !reduceMotion) { b.hidden = false; b.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { duration: SPR.d, easing: SPR.e }); }
  b.hidden = !on;
  b.classList.toggle('lift', dockSide === 'bottom' || dockCorner === 'br');
  $('#panel').classList.toggle('isfull', !!(viewer.open && viewer.full));      // keeps clear of the toolbar
}
function syncLights() {
  setTimeout(syncCollapseFull, 0);
  const qf = $('#qFiles'); if (qf) qf.setAttribute('aria-pressed', String(fullKey === 'files'));
  document.querySelectorAll('.lights[data-panel]').forEach(l => {
    const k = l.dataset.panel, y = l.querySelector('[data-act="collapse"]'), g = l.querySelector('[data-act="full"]');
    const yt = k === 'canvas' ? 'Window, 75% of the screen' : k === 'viewer' ? (viewer.collapsed ? 'Unfold' : viewer.mode === 'full' ? 'Window, 75% of the screen' : 'Fold to title bar')
      : k === 'files' ? (fullKey === 'files' ? 'Back to window' : filesState.piled ? 'Spread files out' : 'Gather files') : 'Back to window';
    y.setAttribute('aria-label', yt); y.title = yt; g.setAttribute('aria-label', 'Full screen'); g.title = 'Full screen';
  });
}
function togglePanel(k, act) {
  if (k === 'viewer') return act === 'min' ? closeViewer() : act === 'full' ? setViewerMode('full') : viewer.mode === 'full' ? setViewerMode('win75') : toggleViewerCollapse();
  if (act === 'min') return minimize(k);
  if (act === 'full') return fullKey === k ? nudge(W[k].inner) : enterFull(k);      // green only ever goes full screen
  if (act === 'collapse') return windowed(k);                                       // yellow only ever goes to the 75% window
}
function fullGrid(stagger) {
  const bodies = allFileBodies(), cols = Math.max(2, Math.floor((vw() - 48) / 104)), colW = (vw() - 48) / cols;
  bodies.forEach((b, i) => { const go = () => b.springTo(24 + (i % cols) * colW + (colW - 80) / 2, 164 + Math.floor(i / cols) * 120, null, 190, 27); stagger ? setTimeout(go, i * 22) : go(); });
}
let fileSort = null;
const fmtBytes = n => n < 1000 ? `${Math.max(1, Math.round(n))} bytes` : n < 1e6 ? `${(n / 1e3).toFixed(n < 1e4 ? 1 : 0)} KB` : `${(n / 1e6).toFixed(1)} MB`;
function whenStr(ts) {
  if (!ts) return '—';
  const d = new Date(ts), now = new Date(), loc = langOf(LANG)[3];
  const time = new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit' }).format(d);
  if (d.toDateString() === now.toDateString()) return `${t('Today')}, ${time}`;
  return new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short' }).format(d) + `, ${time}`;
}
function sizeOf(f) {
  if (f.kind === 'folder') return f.children.reduce((t, c) => t + sizeOf(c), 0);
  if (f.kind === 'note') return JSON.stringify(f.strokes).length;
  if (f.kind === 'image') return f.src.length * .75;
  if (f.kind === 'text') return f.body.length;
  const m = /([\d.]+)\s*(KB|MB)/i.exec(f.size || ''); return m ? parseFloat(m[1]) * (m[2].toUpperCase() === 'MB' ? 1e6 : 1e3) : 0;
}
function sortRoot(by) {
  fileSort = by; const order = { folder: 0, note: 1, image: 2, text: 3, doc: 4 };
  const cmp = { date: (a, b) => (b.added || 0) - (a.added || 0), name: (a, b) => a.name.localeCompare(b.name), kind: (a, b) => (order[a.kind] - order[b.kind]) || a.name.localeCompare(b.name), size: (a, b) => sizeOf(b) - sizeOf(a), fav: (a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || (b.added || 0) - (a.added || 0) }[by];
  root.sort(cmp); syncFilesBar(); if (fullKey === 'files') fullGrid(true);
  toast(`Sorted by ${{ date: 'date added', name: 'name', kind: 'type', size: 'size', fav: 'favourites first' }[by]}`);
}
function syncFilesBar() {
  $('#fbCount').textContent = t('All files · {n}', { n: root.length });
  $('#fbSort').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.s === fileSort)));
}
$('#fbSort').addEventListener('click', e => { const b = e.target.closest('button'); if (b) sortRoot(b.dataset.s); });
function nudge(el) { el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.015)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' }); }
function leaveFull() { sheetEl.classList.remove('fullbleed'); fullKey = null; delete document.body.dataset.full; $('#exitFull').hidden = true; $('#filesBar').hidden = true; syncLights(); }
function windowed(k) {
  if (k !== 'canvas') { if (fullKey === k) exitFull(); else if (k === 'files') { toggleFilesPile(); syncLights(); } else nudge(W[k].inner); return; }
  if (W.canvas.min) restore('canvas');
  const tw = Math.round(vw() * .75), th = Math.round(vh() * .75);
  if (fullKey === 'canvas') { leaveFull(); if (relayoutDock) setTimeout(() => relayoutDock(true), 60); }
  else if (Math.abs(PW - tw) < 2 && Math.abs(PH - th) < 2 && Math.abs(sheet.s - 1) < .01) { canvas75 = true; syncRail(); return nudge(sheetWin); }
  sheet.springTo((vw() - tw) / 2, clamp((vh() - th) / 2, 80, vh()), 1, 190, 27);
  animateSize(tw, th, () => { home = computeHome(); });
  const dw = $('#dock .win').offsetWidth, ty = clamp((vh() - th) / 2, 80, vh());
  W.tools.body.springTo((vw() - dw) / 2, Math.min(ty + th + 10, vh() - 64), null, 190, 27);     // the pen bar sits under the note, clear of the file column
  canvas75 = true; syncRail();
}
function centerTop(spring) {
  const w = $('#topWin').offsetWidth, x = (vw() - w) / 2, y = 10;
  spring ? W.today.body.springTo(x, y, null, 220, 26) : W.today.body.place(x, y);
}

// full screen: only one window stays, everything else fades away
function enterFull(k) {
  clearSnap();
  if (fullKey) exitFull(true);
  if (railOn) exitRail();
  fullKey = k; document.body.dataset.full = k; closePop();
  const xb = $('#exitFull'); xb.hidden = false; xb.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { duration: SPR.d, easing: SPR.e });
  const w = W[k];
  if (k === 'today' && w.shrunk) { w.shrunk = false; w.outer.classList.remove('shrunk'); w.body.ts = null; w.body.s = 1; w.body.render(); }
  if (k === 'today') { selKey = todayKey; calMonth = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1); }
  if (k === 'canvas') {
    saved.canvas = { x: sheet.x, y: sheet.y, s: sheet.s, w: PW, h: PH, c75: canvas75 }; saved.dock = { x: W.tools.body.x, y: W.tools.body.y }; canvas75 = false;
    sheetEl.classList.add('fullbleed'); bringToFront('sheet');
    sheet.springTo(0, 0, 1, 190, 27); animateSize(vw(), vh());
    if (relayoutDock) relayoutDock(true);      // same side or corner as before, never pushed off screen
  } else if (k === 'today') {
    saved.today = { x: W.today.body.x, y: W.today.body.y };
    morph($('#topWin'), () => {
      $('#topbar').classList.add('full'); renderToday();
      const r = $('#topWin'); W.today.body.place((vw() - r.offsetWidth) / 2, Math.max(16, (vh() - r.offsetHeight) / 2));
    });
  } else if (k === 'split') {
    closeEverything();
  } else if (k === 'files') {
    closeEverything(); if (viewer.open) closeViewer();          // Files shows only files
    if (filesState.piled) toggleFilesPile(true);
    saved.files = allFileBodies().map(b => ({ b, x: b.x, y: b.y })); saved.hdr = { x: W.files.body.x, y: W.files.body.y };
    W.files.body.springTo(24, 20, null, 190, 27);
    fullGrid(true); syncFilesBar();
    const fb = $('#filesBar'); fb.hidden = false; fb.animate([{ opacity: 0, transform: 'translate(-50%, -12px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], { duration: SPR_OPEN.d, easing: SPR_OPEN.e });
  }
  syncLights();
}
function exitFull(quick) {
  const k = fullKey; if (!k) return;
  fullKey = null; delete document.body.dataset.full; $('#exitFull').hidden = true; $('#filesBar').hidden = true;
  if (k === 'split') closeSplit();
  if (k === 'canvas') {
    sheetEl.classList.remove('fullbleed'); canvas75 = !!saved.canvas.c75;
    if (quick) { cancelAnimationFrame(sizeAnim); sheet.place(saved.canvas.x, saved.canvas.y); sheet.ts = null; sheet.s = saved.canvas.s; sheet.render(); setSize(saved.canvas.w, saved.canvas.h); sizeCanvases(true); sheetEl.classList.remove('resizing'); }
    else { sheet.springTo(saved.canvas.x, saved.canvas.y, saved.canvas.s, 190, 27); animateSize(saved.canvas.w, saved.canvas.h); }
    if (relayoutDock) setTimeout(() => relayoutDock(true), 60);
  }
  else if (k === 'today') {
    morph($('#topWin'), () => { $('#topbar').classList.remove('full'); W.today.body.place(saved.today.x, saved.today.y); });
    if (current.mood != null) setTimeout(() => slidePill(moodPill, moodsEl.querySelector(`[data-i="${current.mood}"]`), true), 30);
  }
  else if (k === 'files') { W.files.body.springTo(saved.hdr.x, saved.hdr.y, null, 170, 22); saved.files.forEach(({ b, x, y }, i) => setTimeout(() => b.springTo(x, y, null, 190, 26), i * 16)); allFileBodies().filter(b => !saved.files.some(q => q.b === b)).forEach(settleNew); }
  syncLights(); syncRail();
}

// collapse the file field into a pile under its header
function toggleFilesPile(instant) {
  const on = !filesState.piled; filesState.piled = on;
  W.files.outer.classList.toggle('collapsed', on); filesLayer.classList.toggle('piled', on);
  const bodies = allFileBodies();
  if (on) {
    saved.pile = bodies.map(b => ({ b, x: b.x, y: b.y }));
    const hx = W.files.body.x + 10, hy = W.files.body.y + 52;
    bodies.forEach((b, i) => { b.el.style.zIndex = 30 + bodies.length - i; b.tilt = (i % 2 ? 1 : -1) * (2 + i * .6); b.springTo(hx + i * 2.5, hy + i * 3, null, 190, 20); });
  } else {
    saved.pile.forEach(({ b, x, y }, i) => instant ? b.place(x, y) : setTimeout(() => b.springTo(x, y, null, 190, 24), i * 25));
  }
}

// minimize to the tray, genie-style
const tray = $('#tray');
function addChip(k) {
  const info = W_INFO[k], c = document.createElement('button'); c.className = 'tchip'; c.dataset.k = k;
  c.innerHTML = `<span class="ic">${icon[info.icon]}</span>${info.label}`; c.setAttribute('aria-label', `Restore ${info.label}`);
  c.addEventListener('click', () => restore(k));
  tray.hidden = false; tray.append(c); return c;
}
function minimize(k) {
  if (fullKey === k) exitFull(true);
  const w = W[k]; if (w.min) return; w.min = true; closePop();
  if (k === 'canvas') {
    closeToolPop(); clearSel();
    canvas75 = false; syncRail();
    const pk = showParked();
    const c = pk.querySelector('.tile').getBoundingClientRect();
    genie(w, c).onfinish = () => {
      w.outer.hidden = true; document.body.classList.add('canvas-closed');
      pk.querySelector('.tile').animate([{ transform: 'scale(.7)' }, { transform: 'none' }], { duration: SPR.d, easing: SPR.e });
    };
    toast(`“${current.name}” closed. It waits in the toolbar; tap it for options.`);
    return;
  }
  const chip = addChip(k); chip.style.opacity = 0;
  const c = chip.getBoundingClientRect();
  const done = () => { chip.style.opacity = ''; chip.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: SPR.d, easing: SPR.e }); };
  if (k === 'files') {
    const bodies = allFileBodies();
    bodies.forEach((b, i) => { const r = b.el.getBoundingClientRect(); b.el.querySelector('.lift').animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${c.left - r.left}px,${c.top - r.top}px) scale(.2)`, opacity: 0 }], { duration: 420, delay: i * 18, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }); });
    genie(w, c).onfinish = () => { w.outer.hidden = true; filesLayer.hidden = true; done(); };
    return;
  }
  genie(w, c).onfinish = () => { w.outer.hidden = true; done(); };
}
function genie(w, c) {
  const a = w.inner.getBoundingClientRect(), ps = w.body.s || 1;
  return w.inner.animate([{ transform: 'none', opacity: 1 },
    { opacity: 1, offset: .55 },
    { transform: `translate(${(c.left - a.left) / ps}px,${(c.top - a.top) / ps}px) scale(${c.width / a.width},${c.height / a.height})`, opacity: 0 }],
    { duration: 520, easing: 'cubic-bezier(.32,.72,0,1)' });
}
function showParked() { syncNoteChip(); return $('#noteChip'); }
function noteAnchor() {
  if (W.canvas.min || document.body.classList.contains('canvas-closed')) return $('#noteChip .tile').getBoundingClientRect();
  const v = rootCtx.views.get(current.id);
  return (v && !filesLayer.hidden && !filesState.piled ? v.el.querySelector('.tile') : $('#filesWin')).getBoundingClientRect();
}
function noteClosed() { try { return W.canvas.min || document.body.classList.contains('canvas-closed'); } catch (_) { return false; } }
function reopenNote() { if (W.canvas.min) restore('canvas'); else loadNote(current); }
function saveCurrent() { if (ctxState) closeCtx(true); openCtx(current, ctxFor(current), $('#noteChip')); showSave(current, ctxFor(current)); }
// the name opens the note when it's closed, otherwise its menu
$('#ncMain').addEventListener('click', e => { if (e.target.closest('.rn')) return; if (ctxState) return closeCtx(); if (noteClosed()) return reopenNote(); openCtx(current, ctxFor(current), $('#noteChip')); });
{ let wasClosed = null; new MutationObserver(() => { const c = document.body.classList.contains('canvas-closed'); if (c !== wasClosed) { wasClosed = c; syncNoteChip(); } }).observe(document.body, { attributes: true, attributeFilter: ['class'] }); }
function restore(k) {
  const w = W[k]; if (!w.min) return; w.min = false;
  if (k === 'canvas') {
    const c = noteAnchor(); w.outer.hidden = false; w.body.settle(); bringToFront('sheet'); setTimeout(() => document.body.classList.remove('canvas-closed'), 60);
    const pk = $('#parked'); if (!pk.hidden) pk.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.8)' }], { duration: 220 }).onfinish = () => { pk.hidden = true; };
    const a = w.inner.getBoundingClientRect(), ps = w.body.s || 1;
    w.inner.animate([{ transform: `translate(${(c.left - a.left) / ps}px,${(c.top - a.top) / ps}px) scale(${c.width / a.width},${c.height / a.height})`, opacity: 0 },
      { transform: 'none', opacity: 1 }], { duration: SPR_OPEN.d, easing: SPR_OPEN.e });
    return;
  }
  const chip = tray.querySelector(`[data-k="${k}"]`), c = chip.getBoundingClientRect();
  w.outer.hidden = false;
  if (k === 'files') { filesLayer.hidden = false; allFileBodies().forEach((b, i) => { const l = b.el.querySelector('.lift'); l.getAnimations().forEach(x => x.cancel()); const r = b.el.getBoundingClientRect();
    l.animate([{ transform: `translate(${c.left - r.left}px,${c.top - r.top}px) scale(.2)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: SPR.d, delay: i * 22, easing: SPR.e, fill: 'backwards' }); }); }
  w.body.settle();
  const a = w.inner.getBoundingClientRect(), ps = w.body.s || 1;
  w.inner.animate([{ transform: `translate(${(c.left - a.left) / ps}px,${(c.top - a.top) / ps}px) scale(${c.width / a.width},${c.height / a.height})`, opacity: 0 },
    { transform: 'none', opacity: 1 }], { duration: SPR_SOFT.d, easing: SPR_SOFT.e });
  chip.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.6)' }], { duration: 200 }).onfinish = () => { chip.remove(); tray.hidden = !tray.children.length; };
  if (k === 'tools' || k === 'today') setTimeout(() => { syncDock(true); if (current.mood != null) slidePill(moodPill, moodsEl.querySelector(`[data-i="${current.mood}"]`), true); }, 30);
}

/* ---------- file viewer window ---------- */
const panelPos = $('#panelPos'), panelEl = $('#panel'), pBody = $('#pBody'), scrim = $('#scrim'), pTitle = $('#pTitle');
const viewer = { open: false, full: false, collapsed: false, stack: [], origin: null, body: new Body(panelPos, { tiltK: 0, raise: false }) };
viewer.body.bounds = () => { const [x0, x1] = span(panelEl.offsetWidth, vw(), 6), [y0, y1] = span(panelEl.offsetHeight, vh(), 6); return { minX: x0, maxX: x1, minY: y0, maxY: y1 }; };
draggable(viewer.body, $('#pHead'), {
  accept: () => !viewer.full,
  moveStart: () => unsnap('viewer'),
  move: e => snapHover(e.clientX, e.clientY),
  tap: (e, tg) => { if (tg === pTitle && pTitle._tap) pTitle._tap(e); },      // taps on the title still rename (double-tap)
  end: (e, v) => { const z = takeSnapHint(); if (z) { snapTo('viewer', z); return false; } if (Math.hypot(v.x, v.y) > 1800) { closeViewer(v); return false; } },
});
// the corner of a file or folder window resizes it; snapped, it moves the divider instead
{
  const h = $('#vResize'); let id = null, s0 = null;
  h.addEventListener('pointerdown', e => {
    if (id !== null || viewer.full) return; e.stopPropagation(); e.preventDefault();
    id = e.pointerId; try { h.setPointerCapture(id); } catch (_) {} h.classList.add('on');
    s0 = { x: e.clientX, y: e.clientY, w: panelEl.offsetWidth, h: pBody.offsetHeight, bx: viewer.body.x, by: viewer.body.y, ratio: snap.ratio, rows: { ...snap.rows } };
    pBody.style.transition = 'none'; bringToFront('panelPos');
  });
  h.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return; const dx = e.clientX - s0.x, dy = e.clientY - s0.y;
    if (snapped('viewer')) return snapResize('viewer', dx, dy, s0);
    const k = viewer.body.s || 1, w = clamp(s0.w + 2 * dx / k, 320, vw() - 24), hh = clamp(s0.h + 2 * dy / k, 120, vh() - 140);
    panelEl.style.width = w + 'px'; pBody.style.height = hh + 'px';
    viewer.body.place(s0.bx - (w - s0.w) * k / 2, s0.by - (hh - s0.h) * k / 2);      // the centre stays put
  });
  const end = e => { if (e.pointerId !== id) return; id = null; h.classList.remove('on'); pBody.style.transition = ''; if (viewer.open) renderView(0); };
  h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
}
$('#pBack').addEventListener('click', () => popView());
scrim.addEventListener('click', () => closeViewer());
$('#exitFull').addEventListener('click', () => exitFull());
$('#collapseFull').addEventListener('click', () => { if (viewer.open && viewer.full) setViewerMode('normal'); else if (fullKey === 'canvas') exitFull(); syncCollapseFull(); });
// tap the empty background to leave the Today or Files full-screen view
document.addEventListener('pointerdown', e => {
  if (viewer.open || !fullKey) return;
  if (e.target.closest('#ctxMenu, #ctxCatch, #emojiPop')) return;
  if (fullKey === 'today' && !e.target.closest('#topbar, #appPop, #exitFull')) exitFull();
});
pTitle.addEventListener('input', () => { const f = viewer.stack[viewer.stack.length - 1]; renameFile(f, pTitle.value); });
dblTapRename(pTitle);
function viewerSize() {
  if (viewer.mode === 'full') return { w: vw() - 32, h: vh() - 32 - 64 };
  if (viewer.mode === 'win75') return { w: Math.round(vw() * .75), h: Math.round(vh() * .75) - 64 };
  return { w: Math.min(600, vw() - 24), h: Math.min(400, vh() - 190) };
}
function markOpened(tileEl) { document.querySelectorAll('.item.opened').forEach(e => e.classList.remove('opened')); const it = tileEl && tileEl.closest('.item'); if (it) it.classList.add('opened'); }
function openViewer(f, tileEl, opt = {}) {
  if (viewer.open) {        // already open: show this file in the same window instead
    if (viewer.stack.length === 1 && viewer.stack[0] === f) return bringToFront('panelPos');
    const kept = ghostViewer();
    { const og = ghosts.find(g => g.f === f && g.el !== tileEl); if (og) removeGhost(og, true); }
    if (viewer.origin) viewer.origin.style.visibility = '';
    viewer.origin = tileEl; if (!railOn && !tileEl.classList.contains('bgwin')) tileEl.style.visibility = 'hidden'; markOpened(tileEl);
    viewer.stack = [f]; renderView(kept || opt.at ? 0 : 1); bringToFront('panelPos');
    if (opt.at) viewer.body.place(opt.at.x, opt.at.y);
    else if (snapped('viewer')) applySnap(true);
    else if (kept) { const c = cascadeFrom(viewer.body.x, viewer.body.y, panelEl.offsetWidth, panelEl.offsetHeight); viewer.body.springTo(c.x, c.y, null, 220, 26); }
    if ((kept || opt.at) && !reduceMotion) panelEl.animate([{ opacity: .6, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: SPR_OPEN.d, easing: SPR_OPEN.e });
    return;
  }
  closePop();
  viewer.open = true; viewer.full = false; viewer.mode = 'normal'; viewer.collapsed = false; panelEl.classList.remove('collapsed'); viewer.shrunk = false; viewer.body.ts = null; viewer.body.s = 1; viewer.stack = [f]; viewer.origin = tileEl;
  const { w, h } = viewerSize();
  panelEl.style.width = w + 'px'; pBody.style.height = h + 'px';
  panelPos.hidden = false; pBody.innerHTML = '';
  renderView(0);
  const ph = panelEl.offsetHeight;
  { const og = ghosts.find(g => g.f === f && g.el !== tileEl); if (og) removeGhost(og, true); }
  if (opt.at) viewer.body.place(opt.at.x, opt.at.y); else viewer.body.place((vw() - w) / 2, clamp((vh() - ph) / 2, 12, vh()));
  const fr = panelEl.getBoundingClientRect(), or = tileEl.getBoundingClientRect();
  if (!railOn && !tileEl.classList.contains('bgwin')) tileEl.style.visibility = 'hidden';
  bringToFront('panelPos'); markOpened(tileEl);
  panelEl.animate([
    { transform: `translate(${or.left - fr.left}px,${or.top - fr.top}px) scale(${or.width / fr.width},${or.height / fr.height})`, borderRadius: '60px', opacity: .5 },
    { transform: 'none', borderRadius: '32px', opacity: 1 }], { duration: SPR_OPEN.d, easing: SPR_OPEN.e });
  for (const el of [$('#pHead'), pBody]) el.animate([{ opacity: 0 }, { opacity: 0, offset: .25 }, { opacity: 1 }], { duration: Math.max(420, SPR_SOFT.d * .7), easing: 'ease-out' });
  syncLights();
  if (opt.rename) setTimeout(() => toast('New folder. Double-tap its name to rename it.'), 350);
  if (snapped('sheet') && snap.slots.sheet.length === 1 && !opt.at) setTimeout(() => { if (viewer.open && !snapped('viewer')) { snap.saved.viewer = winSize('viewer'); snap.slots.viewer = mirror(snap.slots.sheet); applySnap(false); } }, 60);
}
function closeViewer(v) {
  if (!viewer.open) return; setTimeout(syncCollapseFull, 0); delete snap.slots.viewer; delete snap.saved.viewer; viewer.open = false; viewer.full = false; viewer.mode = 'normal'; markOpened(null); setTimeout(syncRail, 0);
  const tile = viewer.origin, fr = panelEl.getBoundingClientRect();
  active.delete(viewer.body);
  let anim;
  if (v) anim = panelPos.animate([{ transform: panelPos.style.transform, opacity: 1 }, { transform: `translate3d(${viewer.body.x + v.x * .25}px,${viewer.body.y + v.y * .25}px,0) scale(.9)`, opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.2,.6,.3,1)' });
  else if (tile && tile.isConnected) {
    const or = tile.getBoundingClientRect();
    anim = panelEl.animate([{ transform: 'none', opacity: 1, borderRadius: '32px' },
      { transform: `translate(${or.left - fr.left}px,${or.top - fr.top}px) scale(${or.width / fr.width},${or.height / fr.height})`, opacity: .4, borderRadius: '70px' }],
      { duration: 460, easing: 'cubic-bezier(.32,.72,0,1)' });
    $('#pHead').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
    pBody.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
  } else anim = panelEl.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.94)' }], { duration: 240 });
  anim.onfinish = () => {
    panelPos.hidden = true; pBody.innerHTML = ''; $('#pHead').getAnimations().forEach(a => a.cancel()); pBody.getAnimations().forEach(a => a.cancel());
    if (tile) { tile.style.visibility = ''; const it = tile.closest('.item'); if (it) { it.classList.remove('pop'); void it.offsetWidth; it.classList.add('pop'); } }
  };
}
function toggleViewerCollapse() {        // yellow on an open file folds it to its title bar; tap again to unfold
  const h0 = pBody.offsetHeight;
  viewer.collapsed = !viewer.collapsed; panelEl.classList.toggle('collapsed', viewer.collapsed);
  const h1 = viewer.collapsed ? 0 : viewerSize().h; pBody.style.height = h1 + 'px'; syncLights();
  if (!snapped('viewer')) viewer.body.springTo(viewer.body.x, viewer.body.y + (h0 - h1) * (viewer.body.s || 1) / 2, null, 200, 26);      // folds toward its centre
}
function setViewerMode(mode) {
  if (viewer.collapsed) { viewer.collapsed = false; panelEl.classList.remove('collapsed'); }
  if (viewer.mode === mode) return nudge(panelEl);
  morph(panelEl, () => {
    viewer.mode = mode; viewer.full = mode === 'full'; panelEl.classList.toggle('isfull', viewer.full);
    const { w, h } = viewerSize(); panelEl.style.width = w + 'px';
    pBody.style.transition = 'none'; pBody.style.height = h + 'px'; void pBody.offsetHeight; pBody.style.transition = '';
    renderView(0);
    viewer.body.place((vw() - w) / 2, mode === 'full' ? 16 : Math.max(12, (vh() - panelEl.offsetHeight) / 2));
  });
  syncLights(); syncRail();
}
function pushView(f) { viewer.stack.push(f); renderView(1); }
function popView() { if (viewer.stack.length > 1) { viewer.stack.pop(); renderView(-1); } }
function subtitle(f) {
  if (f.kind === 'folder') return `${f.children.length} item${f.children.length === 1 ? '' : 's'} · hold one file over another to group them`;
  if (f.kind === 'note') return `Handwritten note · ${esc(f.date)}${f.mood != null ? ' · ' + emo(f.mood, 14) + ' ' + MOODS[f.mood].n : ''}`;
  if (f.kind === 'image') return f.file ? `Image · ${esc(f.file)}` : 'Image';
  if (f.kind === 'doc') return `${esc(f.ext)} · ${esc(f.size)}`;
  return 'Text file';
}
function renderView(dir) {
  const f = viewer.stack[viewer.stack.length - 1];
  pTitle.value = f.name; $('#pSub').innerHTML = subtitle(f);
  $('#pBack').hidden = viewer.stack.length < 2;
  const old = pBody.querySelector('.view:not(.leaving)');
  const view = document.createElement('div'); view.className = 'view'; pBody.append(view);
  if (f.kind === 'folder') buildFolder(view, f); else buildDetail(view, f);
  if (!old) return;
  if (!dir) { old.remove(); return; }
  old.classList.add('leaving');
  old.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${-dir * 60}px) scale(.96)`, opacity: 0 }], { duration: 300, easing: 'cubic-bezier(.4,0,.2,1)' }).onfinish = () => old.remove();
  view.animate([{ transform: `translateX(${dir * 36}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: SPR_OPEN.d, easing: SPR_OPEN.e });
}
function buildFolder(view, f) {
  view.classList.add('scroll');
  const space = document.createElement('div'); space.className = 'space grid'; view.append(space);
  if (!f.children.length) { space.innerHTML = '<div class="empty"><b>This folder is empty</b><small>Drag a file onto it to add one.</small></div>'; space.style.height = '100%'; return; }
  const ROW = 112, ctx = { parent: f, list: f.children, container: space, views: new Map(), grid: true };
  const geo = () => { const w = space.clientWidth || 560, cols = Math.max(2, Math.floor(w / 104)); return { cols, colW: w / cols }; };
  const slot = i => { const { cols, colW } = geo(); return { x: (i % cols) * colW + (colW - 80) / 2, y: 8 + Math.floor(i / cols) * ROW }; };
  const fit = () => { space.style.height = Math.ceil(f.children.length / geo().cols) * ROW + 12 + 'px'; };
  ctx.layout = () => { fit(); f.children.forEach((c, i) => { const v = ctx.views.get(c.id); if (v) { const q = slot(i); v.b.springTo(q.x, q.y, null, 260, 30); } }); };
  ctx.slotAt = (x, y) => { const { cols, colW } = geo(); const col = clamp(Math.round((x - (colW - 80) / 2) / colW), 0, cols - 1), row = Math.max(0, Math.round((y - 8) / ROW)); return clamp(row * cols + col, 0, f.children.length - 1); };
  ctx.bounds = () => ({ minX: -24, maxX: space.clientWidth - 56, minY: -16, maxY: space.clientHeight - 70 });
  fit();
  f.children.forEach((c, i) => {
    const q = slot(i); const { el } = makeItem(c, ctx, q.x, q.y);
    if (!reduceMotion) el.querySelector('.lift').animate([{ transform: 'scale(.92)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: SPR_OPEN.d, easing: SPR_OPEN.e, delay: 40 + i * 30, fill: 'backwards' });
  });
}
function buildDetail(view, f) {
  const d = document.createElement('div'); d.className = 'detail'; view.append(d);
  const stage = document.createElement('div'); stage.className = 'stage'; d.append(stage);
  const foot = document.createElement('div'); foot.className = 'foot'; d.append(foot);
  if (f.kind === 'note') {
    const c = document.createElement('canvas'); stage.append(c);
    const e = extent(f.strokes), h = parseFloat(pBody.style.height) - 20 - 60 - 14, w = Math.min(parseFloat(panelEl.style.width) - 40, h * e.w / e.h);
    c.style.width = w + 'px'; c.style.height = w * e.h / e.w + 'px'; paintStrokes(c, f.strokes, w, w * e.h / e.w);
    const isCur = f === current && !W.canvas.min;
    foot.innerHTML = `<small>${f.strokes.length ? f.strokes.length + (f.strokes.length === 1 ? ' stroke' : ' strokes') : 'Empty page'}</small><button class="cta">Open</button>`;
    foot.querySelector('.cta').addEventListener('click', () => { closeViewer(); setTimeout(() => loadNote(f), 140); });
  } else if (f.kind === 'image') {
    stage.innerHTML = `<img src="${f.src}" alt="${esc(f.name)}" draggable="false">`;
    foot.innerHTML = `<small>${f.file ? 'Imported today' : 'Sample photo'}</small>`;
  } else if (f.kind === 'text') {
    const pre = document.createElement('pre'); pre.textContent = f.body; stage.append(pre);
    pre.addEventListener('pointerdown', e => e.stopPropagation());
    foot.innerHTML = `<small>${f.body.split(/\s+/).filter(Boolean).length} words</small>`;
  } else {
    stage.innerHTML = `<div class="nopreview"><div class="tile glass k-doc" style="width:96px;height:120px;border-radius:20px"><span class="ext big">${esc(f.ext)}</span></div><b>${esc(f.name)}</b><small>${esc(f.size)} · Preview is not part of this demo.</small></div>`;
  }
}

/* ---------- notes: open / new ---------- */
let chipT = 0;
function queueChipPaint() {      // the small thumbnail redraws every stroke, so it waits for a pause
  clearTimeout(chipT); chipT = setTimeout(() => { if (ink) return queueChipPaint(); const cv = $('#noteChip canvas'); if (cv) { cv.dataset.note = current.id; paintStrokes(cv, current.strokes, 34, 26); } }, 450);
}
function syncNoteChip() {
  const ch = $('#noteChip'); if (!ch) return; const cv = ch.querySelector('canvas'); cv.dataset.note = current.id; queueChipPaint();
  if (!ch.querySelector('.rn')) ch.querySelector('.label').textContent = current.name;
  const closed = noteClosed(), st = $('#ncState');
  const k = closed ? 'closed' : current.draft ? 'draft' : 'saved';
  if (st.dataset.k === k && st.dataset.l === LANG) return;
  st.className = 'nc-st ' + k; st.textContent = t(closed ? 'Closed' : current.draft ? 'Not saved' : 'Saved'); st.dataset.k = k; st.dataset.l = LANG;
  $('#ncMain').title = closed ? t('Tap to open this note') : t('Tap for options');
}
function setCurrentMarker() { syncNoteChip(); document.querySelectorAll('.item.current').forEach(e => e.classList.remove('current')); document.querySelectorAll(`.item[data-id="${current.id}"]`).forEach(e => e.classList.add('current')); }
function loadNote(f, opt = {}) {
  if (!f) return;
  if (fullKey === 'files') exitFull(true);
  bringToFront('sheet');
  if (f === current) { if (W.canvas.min) restore('canvas'); return; }
  const kept = !W.canvas.min && !fullKey && !sheetEl.classList.contains('collapsed') && ghostCurrentNote(opt.force);
  { const og = ghosts.find(g => g.f === f); if (og) removeGhost(og, true); }
  if (W.canvas.min) restore('canvas');
  if (sheetEl.classList.contains('collapsed')) sheetEl.classList.remove('collapsed');
  const inkEl = $('#sheet .ink');
  const swap = () => {
    clearSel(); current = f; Z = 1; zx = zy = 0; titleIn.value = f.name; setPaper(f.paper || 'grid'); redrawBase(); setMood(f.mood, false); noteChanged(); setCurrentMarker();
    inkEl.animate([{ opacity: 0, transform: 'scale(1.02)' }, { opacity: 1, transform: 'none' }], { duration: SPR_SOFT.d, easing: SPR_SOFT.e });
  };
  if (kept || opt.at) {       // a new window: the old note stays behind as its own window, this one comes forward
    if (opt.at) {
      sheet.place(opt.at.x, opt.at.y); sheet.s = opt.at.s; sheet.render();
      if (Math.abs(opt.at.w - PW) > .5 || Math.abs(opt.at.h - PH) > .5) setSize(opt.at.w, opt.at.h);
      sizeCanvases(true);
    } else if (!snapped('sheet')) { const c = cascadeFrom(sheet.x, sheet.y, PW * sheet.s, PH * sheet.s); sheet.springTo(c.x, c.y, null, 220, 26); }
    swap();
    if (!reduceMotion) $('#sheetWin').animate([{ opacity: .6, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: SPR_OPEN.d, easing: SPR_OPEN.e });
    return;
  }
  if (reduceMotion) return swap();
  inkEl.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.98)' }], { duration: 200, easing: 'ease-in' }).onfinish = swap;
}
function newNote() {
  if (fullKey === 'files') exitFull(true); else if (fullKey === 'today') exitFull();
  if (W.files.min) restore('files');
  if (filesState.piled) toggleFilesPile(true);
  const f = Object.assign(mk.note('Untitled', [], todayStr, current.mood, 'grid'), { draft: true }); root.unshift(f);
  const orb = quickPos('qNew'); const spot = freeSpot(rootCtx, area());
  settleNew(makeItem(f, rootCtx, orb.x, orb.y, 'pop').b);
  updateCount(); loadNote(f); toast('New note. Double-tap its name to rename it.');
}

/* ---------- import ---------- */
const fileInput = $('#fileInput');
fileInput.addEventListener('change', () => { importFiles([...fileInput.files], null, importTarget); importTarget = null; fileInput.value = ''; });
fileInput.addEventListener('cancel', () => { importTarget = null; });
addEventListener('dragover', e => e.preventDefault());
addEventListener('drop', e => { e.preventDefault(); const fs = [...(e.dataTransfer && e.dataTransfer.files || [])]; if (fs.length) importFiles(fs, { x: e.clientX - 40, y: e.clientY - 40 }); });
function humanSize(n) { return n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB'; }
function importFiles(files, at, into) {
  const big = files.filter(f => f.size > MAX_IMPORT); files = files.filter(f => f.size <= MAX_IMPORT);
  if (big.length) toast(`${big.length} file${big.length > 1 ? 's are' : ' is'} over 25 MB and wasn’t imported`);
  if (!files.length) return;
  if (into) {
    let done = 0;
    files.forEach(file => readFile(file, f => { into.children.push(f); if (++done === files.length) { refreshFolder(into); afterTreeChange(); toast(`Imported ${files.length} into ${into.name}`); } }));
    return;
  }
  if (W.files.min) restore('files');
  if (filesState.piled) toggleFilesPile(true);
  const orb = quickPos('qImport'); let done = 0;
  files.forEach((file, i) => {
    const place = f => {
      root.push(f); const spot = at ? { x: at.x + i * 24, y: at.y + i * 18 } : freeSpot(rootCtx, area());
      const { b } = makeItem(f, rootCtx, at ? spot.x : orb.x, at ? spot.y : orb.y, 'pop');
      setTimeout(() => settleNew(b), 60 + i * 40);
      if (++done === files.length) { toast(`Imported ${files.length} file${files.length > 1 ? 's' : ''}`); updateCount(); syncFilesBar(); if (fullKey === 'files') setTimeout(() => fullGrid(), 350); }
    };
    readFile(file, place);
  });
}
const MAX_IMPORT = 25 * 1024 * 1024;   // 25 MB per file: keeps the page responsive and memory bounded
function readFile(file, place) {
  if (file.size > MAX_IMPORT) { toast(`“${file.name.slice(0, 40)}” is over 25 MB, so it wasn’t imported`); return; }
  const ext = (file.name.split('.').pop() || '').toUpperCase().slice(0, 4);
  const rd = new FileReader();
  if (file.type.startsWith('image/')) { rd.onload = () => place(Object.assign(mk.image(file.name, rd.result), { file: humanSize(file.size) })); rd.readAsDataURL(file); }
  else if (file.type.startsWith('text/') || /\.(txt|md|csv|json)$/i.test(file.name)) { rd.onload = () => place(mk.text(file.name, String(rd.result).slice(0, 20000))); rd.readAsText(file); }
  else place(mk.doc(file.name.replace(/\.[^.]+$/, ''), ext || 'FILE', humanSize(file.size)));
}

/* ---------- toast ---------- */
const toastEl = $('#toast'); let toastAnim;
function toast(msg) {
  toastEl.textContent = msg; toastAnim && toastAnim.cancel();
  toastAnim = toastEl.animate([
    { opacity: 0, transform: 'translate(-50%, 16px) scale(.9)' },
    { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: .12 },
    { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: .85 },
    { opacity: 0, transform: 'translate(-50%, 8px) scale(.96)' }], { duration: 2800, easing: 'ease-out' });
}

/* ---------- theme ---------- */
function themeChanged() { colorCache = {}; redrawBase(); scheduleLive(); for (const f of walk(root)) if (f.kind === 'note') repaintThumbs(f); syncDock(true); syncThemeTg(); drawPreview(); }
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeChanged);
new MutationObserver(themeChanged).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });


/* ---------- language: a circle with the short code; tap to see all, the chosen one opens to its full name ---------- */
const langBtn = $('#langBtn');
const tNodes = [], tAttrs = [];
function collectI18n() {
  const walk = n => { if (n.nodeType === 3) { const k = n.nodeValue.trim(); if (I18N[k]) tNodes.push([n, k]); } else if (n.nodeType === 1 && !n.matches('.langs, input, canvas')) n.childNodes.forEach(walk); };
  document.querySelectorAll('#topbar .row, #hint span, #selBar, #filesBar, #rail .rhd').forEach(walk);
  document.querySelectorAll('[aria-label], [title]').forEach(el => { if (el.closest('.langs')) return; for (const a of ['aria-label', 'title']) { const v = el.getAttribute(a); if (v && I18N[v]) tAttrs.push([el, a, v]); } });
}
function applyLang() {
  document.documentElement.lang = LANG;
  for (const [n, k] of tNodes) n.nodeValue = t(k);
  for (const [el, a, k] of tAttrs) el.setAttribute(a, t(k));
  langBtn.querySelector('b').innerHTML = flagSVG(LANG, 24); langBtn.setAttribute('aria-label', `${t('Language')}: ${langOf(LANG)[2]}`); langBtn.title = t('Language');
  $('#today').textContent = fmtL().format(new Date());
  if (current.mood == null) $('#moodName').textContent = t("How's today?");
  setHintLine(); updateMeta(); updateCount(); syncFilesBar(); syncSelBar(); syncThemeTg();
}
function langListHTML() {
  return `<h4>${esc(t('Language'))}</h4><div class="lglist" role="radiogroup" aria-label="${esc(t('Language'))}">${LANGS.map(([c, ab, full]) =>
    `<button class="lgrow" role="radio" data-l="${c}" aria-checked="${c === LANG}" lang="${c}" aria-label="${esc(full)}"><b class="flag">${flagSVG(c, 28)}</b><span>${esc(full)}</span></button>`).join('')}</div>`;
}
function setLang(c) {
  if (!langOf(c) || c === LANG) return;
  LANG = c; try { localStorage.setItem('olaa-lang', c); } catch (_) {}
  if (ctxState) closeCtx(true);
  const wasCentered = Math.abs(W.today.body.x - (vw() - $('#topWin').offsetWidth * W.today.body.s) / 2) < 8 || !!fullKey;
  morph($('#topWin'), () => { applyLang(); if (wasCentered && fullKey !== 'today') centerTop(false); }, { spr: SPR_OPEN });
}
langBtn.addEventListener('click', e => { e.stopPropagation(); if (popKind === 'lang') return closeToolPop(); openToolPop('lang', langBtn); });

/* ---------- tap empty space: close whatever is open, like stamping it shut ---------- */
const OPEN_UI = '.bgwin, .pane, #topbar, #sheet, #dock, #files .item, #rail, #filesHdr, #panelPos, #scrim, #appPop, #emojiPop, #ctxMenu, #ctxCatch, #toolPop, #tray, #exitFull, #filesBar, #selBar, #parked, #toast';
let outside = null;
document.addEventListener('pointerdown', e => {
  outside = e.isPrimary && !e.target.closest(OPEN_UI) ? { x: e.clientX, y: e.clientY, t: e.timeStamp, open: anythingOpen() } : null;
}, true);
document.addEventListener('pointerup', e => {
  const o = outside; outside = null;
  if (!o || e.timeStamp - o.t > 600 || Math.hypot(e.clientX - o.x, e.clientY - o.y) > 10) return;
  if (o.open || anythingOpen()) { closeEverything(); stamp(e.clientX, e.clientY); }
}, true);
function anythingOpen() { return emojiOpen || !moodsEl.hidden || !!popKind || !!popApp || !!ctxState || (viewer.open && !viewer.full) || selecting || !!sel; }
function closeEverything() {
  closeEmojiPop(); toggleMoodRow(false); closeToolPop(); closePop(); closeCtx();
  if (viewer.open && !viewer.full) closeViewer();
  if (selecting) endSelect(); clearSel();
}
function stamp(x, y) {      // a small soft ring where you tapped, so you can see the tap closed things
  if (reduceMotion) return;
  const d = document.createElement('div'); d.className = 'stamp'; d.style.left = x + 'px'; d.style.top = y + 'px'; document.body.append(d);
  d.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: .9 }, { transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 }], { duration: 480, easing: 'cubic-bezier(.2,.7,.2,1)' }).onfinish = () => d.remove();
}

/* zoom: pinch and double-tap on the page; Cmd +/-/0 and Ctrl-scroll or a trackpad pinch on a computer */
addEventListener('keydown', e => {
  if (!(e.metaKey || e.ctrlKey) || e.target.closest('input, textarea')) return;
  if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomStep(1); } else if (e.key === '-') { e.preventDefault(); zoomStep(-1); } else if (e.key === '0') { e.preventDefault(); zoomTo(1); }
});
sheetEl.addEventListener('wheel', e => {
  if (!e.ctrlKey && !e.metaKey) { if (Z > 1) { e.preventDefault(); zx += e.deltaX / Z; zy += e.deltaY / Z; applyZoom(); } return; }
  e.preventDefault(); const r = paper.getBoundingClientRect(), q = toLocal(e, r, r.width / PW); zoomTo(Z * Math.exp(-e.deltaY * .01), q.x, q.y, true);
}, { passive: false });

{ // the recent files list opens on a tap, or as soon as you hold
  const rb = $('#recentTb'); let holdT = 0, heldOpen = false;
  rb.addEventListener('pointerdown', () => { heldOpen = false; clearTimeout(holdT); holdT = setTimeout(() => { if (popKind !== 'recent') { heldOpen = true; rb.classList.add('held'); openToolPop('recent', rb); } }, 380); });
  const stop = () => { clearTimeout(holdT); rb.classList.remove('held'); };
  rb.addEventListener('pointerup', stop); rb.addEventListener('pointercancel', stop); rb.addEventListener('pointerleave', stop);
  rb.addEventListener('click', () => { if (heldOpen) { heldOpen = false; return; } if (popKind === 'recent') closeToolPop(); else openToolPop('recent', rb); });
}


/* ---------- split screen: 2-4 files side by side, like Windows snap layouts ---------- */
let split = null;      // { n, panes: [{ f, el, r }], live: index of the pane the drawing engine is in }
const splitLayer = $('#splitLayer');
const SPLIT_SVG = {
  2: '<rect x="1" y="1" width="28" height="20" rx="3"/><path d="M15 1v20"/>',
  3: '<rect x="1" y="1" width="28" height="20" rx="3"/><path d="M15 1v20M15 11h14"/>',
  4: '<rect x="1" y="1" width="28" height="20" rx="3"/><path d="M15 1v20M1 11h28"/>',
};
function splitHTML() {
  const opts = [2, 3, 4].map(n => `<button class="opt" data-split="${n}" aria-pressed="${!!split && split.n === n}"><svg viewBox="0 0 30 22">${SPLIT_SVG[n]}</svg><span><b>${esc(t(n + ' files'))}</b><small>${esc(t(n === 2 ? 'Side by side' : n === 3 ? 'One large, two stacked' : 'A grid of four'))}</small></span></button>`).join('');
  return `<h4>${esc(t('Split screen'))}</h4><div class="splitopts">${opts}${split ? `<button class="opt" data-split="0"><svg viewBox="0 0 30 22"><rect x="1" y="1" width="28" height="20" rx="3"/></svg><span><b>${esc(t('Close split screen'))}</b><small>${esc(t('Back to one window'))}</small></span></button>` : ''}</div>`;
}
// the space between the top bar and the toolbar, cut into n panes
function splitRects(n) {
  const tb = $('#topWin').getBoundingClientRect(), d = $('#dock .win').getBoundingClientRect(), g = 10;
  let x0 = 12, y0 = tb.bottom + 12, x1 = vw() - 12, y1 = vh() - 12;
  if (dockSide === 'bottom') y1 = Math.min(y1, d.top - 12); else if (dockSide === 'top') y0 = Math.max(y0, d.bottom + 12);
  else if (dockSide === 'left') x0 = Math.max(x0, d.right + 12); else x1 = Math.min(x1, d.left - 12);
  const W = x1 - x0, H = y1 - y0, half = (W - g) / 2, halfH = (H - g) / 2;
  if (vw() < 760) { const h = (H - g * (n - 1)) / n; return Array.from({ length: n }, (_, i) => ({ x: x0, y: y0 + i * (h + g), w: W, h })); }      // phone: stacked
  if (n === 2) return [{ x: x0, y: y0, w: half, h: H }, { x: x0 + half + g, y: y0, w: half, h: H }];
  if (n === 3) return [{ x: x0, y: y0, w: half, h: H }, { x: x0 + half + g, y: y0, w: half, h: halfH }, { x: x0 + half + g, y: y0 + halfH + g, w: half, h: halfH }];
  return [0, 1, 2, 3].map(i => ({ x: x0 + (i % 2) * (half + g), y: y0 + Math.floor(i / 2) * (halfH + g), w: half, h: halfH }));
}
// files to fill the panes: the note, what is open, then the most recent
function splitCandidates() {
  const out = [current], add = f => { if (f && !out.includes(f) && fileExists(f)) out.push(f); };
  if (viewer.open) add(viewer.stack[viewer.stack.length - 1]);
  [...ghosts].reverse().forEach(g => add(g.f));
  [...walk(root)].filter(f => f.kind !== 'folder').sort((a, b) => (b.added || 0) - (a.added || 0)).forEach(add);
  return out;
}
const splitK = r => Math.min(r.w / saved.split.w, r.h / saved.split.h);      // pages keep their proportions and fit the pane
function paneBox(p) { const b = p.el.querySelector('.pbody').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; }
function paneGeo(p) { const r = paneBox(p), k = splitK(r); return { x: r.x, y: r.y, s: k, w: r.w / k, h: r.h / k }; }
function paneHTML(p) {
  const f = p.f, k = KIND[f.kind] ? t(KIND[f.kind]) : '';
  let body = '';
  if (f.kind === 'note') body = `<canvas></canvas><span class="tapnote">${esc(t('Tap to write here'))}</span>`;
  else if (f.kind === 'image') body = `<img src="${f.src}" alt="${esc(f.name)}" draggable="false">`;
  else if (f.kind === 'text') body = `<pre></pre>`;
  else if (f.kind === 'folder') body = `<ul>${f.children.map(c => `<li>${esc(c.name)}</li>`).join('')}</ul>`;
  else body = `<div class="pdoc"><b>${esc(f.ext || '')}</b><span>${esc(f.size || '')}</span></div>`;
  return `<header><b>${esc(f.name)}</b><small>${esc(k)}</small><button class="pchg">${esc(t('Change file'))}</button></header><div class="pbody${f.kind === 'note' ? ' pp-' + (f.paper || 'grid') : ''}">${body}</div>`;
}
function paintPane(p) {
  if (p.f.kind === 'text') { const pre = p.el.querySelector('pre'); if (pre) pre.textContent = p.f.body || ''; }
  if (p.f.kind !== 'note') return;
  const body = p.el.querySelector('.pbody'), c = p.el.querySelector('canvas'); if (!c) return;
  const w = body.clientWidth, h = body.clientHeight, dpr = Math.min(2, devicePixelRatio || 1), k = splitK({ w, h });
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.width = w + 'px'; c.style.height = h + 'px';
  const x = c.getContext('2d'); x.setTransform(k * dpr, 0, 0, k * dpr, 0, 0); for (const st of p.f.strokes) drawStroke(x, st);
}
function renderPane(i) {
  const p = split.panes[i], r = p.r;
  Object.assign(p.el.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
  p.el.className = 'pane glass' + (i === split.live ? ' is-live' : '');
  p.el.innerHTML = paneHTML(p); p.el.dataset.i = i;
  if (i !== split.live) paintPane(p);
}
function placeLive() {      // the drawing engine fills the live pane
  const g = paneGeo(split.panes[split.live]);
  cancelAnimationFrame(sizeAnim); sheet.place(g.x, g.y); sheet.ts = null; sheet.s = g.s; sheet.render();
  setSize(g.w, g.h); Z = 1; zx = zy = 0; applyZoom(); sizeCanvases(true); bringToFront('sheet');
}
function layoutSplit() {
  if (!split) return; const rs = splitRects(split.n);
  split.panes.forEach((p, i) => { p.r = rs[i]; renderPane(i); });
  placeLive();
}
function openSplit(n) {
  if (vw() < 760) n = Math.min(n, 3);
  if (!split) {
    if (fullKey) exitFull(true);
    if (viewer.open) closeViewer();
    saved.split = { x: sheet.x, y: sheet.y, s: sheet.s, w: PW, h: PH };
    enterFull('split');
  }
  const before = split ? new Map(split.panes.map(p => [p.f, p.el.getBoundingClientRect()])) : null;      // where panes were, to morph from
  const cands = splitCandidates(), keep = split ? split.panes.map(p => p.f) : [];
  const files = [...keep.filter(f => fileExists(f)), ...cands.filter(f => !keep.includes(f))].slice(0, n);
  if (split) split.panes.forEach(p => p.el.remove());
  const live = Math.max(0, files.indexOf(current));
  split = { n, live, panes: files.map(f => { const el = document.createElement('div'); splitLayer.append(el); return { f, el, r: null }; }) };
  const from = $('#sheetWin').getBoundingClientRect();
  splitLayer.hidden = false; layoutSplit();
  if (reduceMotion) split.panes.forEach((p, i) => p.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: i * 50, fill: 'backwards' }));      // Reduce Motion: fade in
  else {
    // panes that were already there morph to their new place and size; new ones unfold from the Split button, one after another
    const b = $('#qSplit').getBoundingClientRect();
    split.panes.forEach((p, i) => {
      const r = p.el.getBoundingClientRect(), o = before && before.get(p.f);
      if (o && o.width) {
        p.el.animate([{ transformOrigin: '0 0', transform: `translate(${o.left - r.left}px,${o.top - r.top}px) scale(${o.width / r.width},${o.height / r.height})` }, { transformOrigin: '0 0', transform: 'none' }],
          { duration: 520, easing: 'cubic-bezier(.2,.9,.25,1.02)' });
        return;
      }
      const dx = b.left + b.width / 2 - (r.left + r.width / 2), dy = b.top + b.height / 2 - (r.top + r.height / 2);
      p.el.animate([{ opacity: 0, transform: `translate(${dx}px,${dy}px) scale(.12)` }, { opacity: 1, offset: .35 }, { opacity: 1, transform: 'none' }],
        { duration: 600, delay: i * 80, easing: 'cubic-bezier(.2,.9,.25,1.05)', fill: 'backwards' });
    });
    flipSheet(from);
  }
}
// FLIP: the note window looks like it moves from where it was to where it is now
function flipSheet(from) {
  const sw = $('#sheetWin'), to = sw.getBoundingClientRect(); if (!to.width || !from.width) return;
  sw.animate([{ transformOrigin: '0 0', transform: `translate(${(from.left - to.left) / (sheet.s || 1)}px,${(from.top - to.top) / (sheet.s || 1)}px) scale(${from.width / to.width},${from.height / to.height})` },
    { transformOrigin: '0 0', transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.9,.25,1.02)' });
}
function closeSplit() {
  if (!split) return;
  const b = $('#qSplit').getBoundingClientRect(), from = $('#sheetWin').getBoundingClientRect();
  split.panes.forEach((p, i) => {      // the panes fold back into the Split button
    if (reduceMotion) { p.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).onfinish = () => p.el.remove(); return; }
    const r = p.el.getBoundingClientRect(), dx = b.left + b.width / 2 - (r.left + r.width / 2), dy = b.top + b.height / 2 - (r.top + r.height / 2);
    p.el.style.pointerEvents = 'none';
    p.el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translate(${dx}px,${dy}px) scale(.12)` }], { duration: 380, delay: i * 40, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' }).onfinish = () => p.el.remove();
  });
  split = null; setTimeout(() => { if (!split) splitLayer.hidden = true; }, 560);
  const sv = saved.split; cancelAnimationFrame(sizeAnim); setSize(sv.w, sv.h); sizeCanvases(true);
  home = computeHome(); sheet.springTo(home.x, home.y, home.s, 170, 22); redrawBase();
  if (!reduceMotion) requestAnimationFrame(() => flipSheet(from));
}
// touch a note pane: it becomes the live one; the one you were in becomes a still copy
function activatePane(i) {
  const p = split.panes[i]; if (i === split.live || p.f.kind !== 'note') return;
  const prev = split.live; split.live = i;
  renderPane(prev); renderPane(i);
  loadNote(p.f, { at: paneGeo(p) });
}
let pickPane = -1;
splitLayer.addEventListener('click', e => {
  const el = e.target.closest('.pane'); if (!el || !split) return; const i = +el.dataset.i;
  if (e.target.closest('.pchg')) { pickPane = i; return openToolPop('pick', e.target.closest('.pchg')); }
  activatePane(i);
});
// the live pane's own "Change file" sits under the live note: give it a way in through the note's title
function setPaneFile(i, f) {
  const p = split.panes[i]; if (!p || !f) return;
  const other = split.panes.findIndex((q, j) => j !== i && q.f === f);
  if (other >= 0) split.panes[other].f = p.f;      // swap rather than show the same file twice
  p.f = f;
  if (i === split.live) {
    if (f.kind === 'note') { renderPane(i); if (other >= 0) renderPane(other); return loadNote(f, { at: paneGeo(p) }); }
    const nextNote = split.panes.findIndex((q, j) => j !== i && q.f.kind === 'note');
    if (nextNote >= 0) { split.live = nextNote; renderPane(i); if (other >= 0) renderPane(other); renderPane(nextNote); return loadNote(split.panes[nextNote].f, { at: paneGeo(split.panes[nextNote]) }); }
    toast(t('One pane always holds a note')); p.f = current; return renderPane(i);
  }
  renderPane(i); if (other >= 0) renderPane(other);
}
$('#qSplit').addEventListener('click', e => { e.stopPropagation(); if (popKind === 'split') return closeToolPop(); openToolPop('split', $('#qSplit')); });


/* ---------- snap: drag a window to an edge (half) or a corner (quarter), like Windows.
   Resizing a snapped window by its corner moves the divider; the window beside it gives way. ---------- */
const snap = { ratio: .5, rows: { l: .5, r: .5 }, slots: {}, saved: {} };      // slots: { sheet: 'l' | 'r' | 'tl' | 'bl' | 'tr' | 'br', viewer: … }
const snapPrev = $('#snapPreview'); let snapHint = null, snapViewT = 0;
const snapped = w => !!snap.slots[w];
function snapArea() {
  const tb = $('#topWin').getBoundingClientRect(), d = $('#dock .win').getBoundingClientRect();
  let x0 = 10, y0 = tb.bottom + 10, x1 = vw() - 10, y1 = vh() - 10;
  if (dockSide === 'bottom') y1 = Math.min(y1, d.top - 10); else if (dockSide === 'top') y0 = Math.max(y0, d.bottom + 10);
  else if (dockSide === 'left') x0 = Math.max(x0, d.right + 10); else x1 = Math.min(x1, d.left - 10);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
function slotRect(slot) {
  const a = snapArea(), g = 10, col = slot[slot.length - 1], xm = a.x + a.w * snap.ratio;
  const x = col === 'l' ? a.x : xm + g / 2, w = col === 'l' ? a.w * snap.ratio - g / 2 : a.x + a.w - xm - g / 2;
  if (slot.length === 1) return { x, y: a.y, w, h: a.h };
  const ym = a.y + a.h * snap.rows[col], top = slot[0] === 't';
  return { x, w, y: top ? a.y : ym + g / 2, h: top ? a.h * snap.rows[col] - g / 2 : a.y + a.h - ym - g / 2 };
}
function zoneAt(x, y) {
  if (fullKey || vw() < 760) return null;
  const a = snapArea(), E = 34, C = 110, side = x < a.x + E ? 'l' : x > a.x + a.w - E ? 'r' : null;
  if (!side) return null;
  return y < a.y + C ? 't' + side : y > a.y + a.h - C ? 'b' + side : side;
}
function snapHover(x, y) {
  const z = zoneAt(x, y); if (z === snapHint) return; snapHint = z;
  if (!z) return snapPrev.classList.remove('on');
  const fresh = !Object.keys(snap.slots).length, keep = { ratio: snap.ratio, rows: { ...snap.rows } };
  if (fresh) { snap.ratio = .5; snap.rows = { l: .5, r: .5 }; }
  const r = slotRect(z); if (fresh) Object.assign(snap, keep);
  const wasOn = snapPrev.classList.contains('on'); if (!wasOn) { snapPrev.style.transition = 'none'; }      // appears where it will land, then glides between zones
  Object.assign(snapPrev.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
  if (!wasOn) { void snapPrev.offsetWidth; snapPrev.style.transition = ''; } snapPrev.classList.add('on');
}
function takeSnapHint() { const z = snapHint; snapHint = null; snapPrev.classList.remove('on'); return z; }
const mirror = z => z.replace(/[lr]$/, c => c === 'l' ? 'r' : 'l');
function winSize(w) { return w === 'sheet' ? { w: PW, h: PH } : { w: panelEl.offsetWidth, h: pBody.offsetHeight }; }
function applyWin(w, r, instant) {
  if (w === 'sheet') {
    const k = sheet.s || 1;
    if (instant) { cancelAnimationFrame(sizeAnim); sheet.place(r.x, r.y); setSize(r.w / k, r.h / k); }
    else { sheet.springTo(r.x, r.y, null, 210, 26); animateSize(r.w / k, r.h / k, () => sizeCanvases(true)); }
  } else if (w === 'viewer' && viewer.open) {
    const hh = $('#pHead').offsetHeight;
    pBody.style.transition = instant ? 'none' : ''; panelEl.style.width = r.w + 'px'; pBody.style.height = Math.max(80, r.h - hh) + 'px';
    instant ? viewer.body.place(r.x, r.y) : viewer.body.springTo(r.x, r.y, null, 210, 26);
    clearTimeout(snapViewT); snapViewT = setTimeout(() => { if (viewer.open) { pBody.style.transition = ''; renderView(0); } }, instant ? 160 : 380);      // the content re-fits once the size settles
  }
}
function applySnap(instant) { for (const [w, slot] of Object.entries(snap.slots)) applyWin(w, slotRect(slot), instant); }
function snapTo(w, zone) {
  if (!Object.keys(snap.slots).length) { snap.ratio = .5; snap.rows = { l: .5, r: .5 }; }
  if (!snapped(w)) snap.saved[w] = winSize(w);
  for (const [o, z] of Object.entries(snap.slots)) if (o !== w && z === zone) { snap.slots[o] = mirror(zone); }      // the window already there moves across
  snap.slots[w] = zone;
  // snap assist: the other open window fills the other half
  const other = w === 'sheet' ? 'viewer' : 'sheet', otherOpen = other === 'viewer' ? viewer.open : !W.canvas.min;
  if (zone.length === 1 && otherOpen && !snapped(other)) { snap.saved[other] = winSize(other); snap.slots[other] = mirror(zone); }
  if (w === 'viewer' || snapped('viewer')) bringToFront('panelPos');
  applySnap(false);
}
// leaving a snap keeps the window's snapped size and shape; only resizing it by hand changes that
function unsnap(w) {
  if (!snapped(w)) return; delete snap.slots[w]; delete snap.saved[w];
  if (w === 'sheet') sizeCanvases(true);
}
function clearSnap() { for (const w of Object.keys(snap.slots)) unsnap(w); }
// dragging a snapped window's corner moves the divider (and its row line in a quarter)
function snapResize(w, dx, dy, base) {
  const a = snapArea(), slot = snap.slots[w], col = slot[slot.length - 1];
  snap.ratio = clamp(base.ratio + (col === 'l' ? dx : -dx) / a.w, .2, .8);
  if (slot.length === 2) snap.rows[col] = clamp(base.rows[col] + (slot[0] === 't' ? dy : -dy) / a.h, .2, .8);
  applySnap(true);
}


/* ---------- preview from Recent files: drag a file out of the list ----------
   A preview card lifts and follows your finger. Back on the list, or in a corner of the screen, it is only a preview:
   let go and it flies back. Drag it all the way out over the workspace and let go: the file opens. */
let peekArmed = false, peekJustEnded = false;
function peekBody(f) {
  if (f.kind === 'note') return '<canvas></canvas>';
  if (f.kind === 'image') return `<img src="${f.src}" alt="" draggable="false">`;
  if (f.kind === 'text') return `<pre>${esc((f.body || '').slice(0, 420))}</pre>`;
  if (f.kind === 'folder') return `<ul>${f.children.slice(0, 7).map(c => `<li>${esc(c.name)}</li>`).join('')}</ul>`;
  return `<div class="pdoc"><b>${esc(f.ext || '')}</b><span>${esc(f.size || '')}</span></div>`;
}
function startPeek(f, row, ev) {
  const card = document.createElement('div'); card.className = 'peekcard glass';
  card.innerHTML = `<header><b>${esc(f.name)}</b></header><div class="pv">${peekBody(f)}</div>`;
  const pv = card.querySelector('.pv'), W = 264;
  const im = card.querySelector('img'), ar = f.kind === 'note' ? SH / SW : f.kind === 'image' ? (im && im.naturalWidth ? im.naturalHeight / im.naturalWidth : .75) : f.kind === 'text' ? 1.1 : .62;
  pv.style.height = Math.round(W * Math.min(1.25, Math.max(.5, ar))) + 'px';
  if (im && !im.naturalWidth) im.onload = () => { pv.style.height = Math.round(W * Math.min(1.25, Math.max(.5, im.naturalHeight / im.naturalWidth))) + 'px'; };
  document.body.append(card);
  const cv = card.querySelector('canvas'); if (cv) paintStrokes(cv, f.strokes, pv.clientWidth, pv.clientHeight);
  const r = row.getBoundingClientRect(), pop = toolPop.getBoundingClientRect();
  toolPop.classList.add('peeking');
  const d = { card, f, row, pop, sx: ev.clientX, sy: ev.clientY, state: '' };
  if (!reduceMotion) card.animate([{ opacity: 0, transform: `translate(${r.left + 20 - ev.clientX}px,${r.top - ev.clientY}px) scale(.3)` }, { opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,.9,.3,1)', composite: 'add' });
  movePeek(d, ev); return d;
}
function peekState(x, y, pop) {
  const inPop = x > pop.left - 10 && x < pop.right + 10 && y > pop.top - 10 && y < pop.bottom + 10;
  const C = 130, corner = (x < C || x > vw() - C) && (y < C || y > vh() - C);
  const away = Math.max(pop.left - x, x - pop.right, pop.top - y, y - pop.bottom);
  return inPop || corner || away < 120 ? 'preview' : 'open';
}
function movePeek(d, ev) {
  const away = Math.max(0, Math.max(d.pop.left - ev.clientX, ev.clientX - d.pop.right, d.pop.top - ev.clientY, ev.clientY - d.pop.bottom));
  const k = .92 + .18 * Math.min(1, away / 320);      // grows a little as it leaves the list, never past 110%
  const w = d.card.offsetWidth, h = d.card.offsetHeight;
  d.card.style.transform = `translate(${ev.clientX - w / 2}px,${ev.clientY - h * .4}px) scale(${k.toFixed(3)})`;
  const st = peekState(ev.clientX, ev.clientY, d.pop);
  if (st !== d.state) { d.state = st; d.card.classList.toggle('willopen', st === 'open'); }
}
function endPeek(d, ev) {
  toolPop.classList.remove('peeking'); peekArmed = false;
  if (ev.type === 'pointerup' && d.state === 'open') {
    closeToolPop(); openAnywhere(d.f);
    d.card.animate([{ opacity: 1 }, { opacity: 0, transform: d.card.style.transform + ' scale(1.08)' }], { duration: 260, fill: 'forwards' }).onfinish = () => d.card.remove();
    return;
  }
  const r = d.row.getBoundingClientRect();      // only a preview: back into its row
  d.card.animate([{ transform: d.card.style.transform, opacity: 1 }, { transform: `translate(${r.left}px,${r.top - 60}px) scale(.3)`, opacity: 0 }],
    { duration: reduceMotion ? 120 : 380, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).onfinish = () => d.card.remove();
}
toolPop.addEventListener('pointerdown', e => {
  const row = e.target.closest('.rrow'); if (!row || popKind !== 'recent') return;
  const f = [...walk(root)].find(x => x.id === row.dataset.id); if (!f) return;
  const sx = e.clientX, sy = e.clientY, id = e.pointerId; let drag = null;
  const armT = setTimeout(() => { peekArmed = true; row.classList.add('armed'); }, 260);      // hold a moment: then any direction drags (the list stops scrolling)
  const mv = ev => {
    if (ev.pointerId !== id) return;
    const dx = ev.clientX - sx, dy = ev.clientY - sy, dist = Math.hypot(dx, dy);
    if (!drag) {
      if ((Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) || (peekArmed && dist > 6) || (ev.pointerType === 'mouse' && dist > 8)) { clearTimeout(armT); peekArmed = true; drag = startPeek(f, row, ev); }
      else { if (dist > 10) { clearTimeout(armT); done(); } return; }
    }
    movePeek(drag, ev);
  };
  const done = ev => {
    clearTimeout(armT); row.classList.remove('armed'); removeEventListener('pointermove', mv); removeEventListener('pointerup', done); removeEventListener('pointercancel', done);
    if (drag && ev) { peekJustEnded = true; setTimeout(() => { peekJustEnded = false; }, 350); endPeek(drag, ev); } else peekArmed = false;
  };
  addEventListener('pointermove', mv); addEventListener('pointerup', done); addEventListener('pointercancel', done);
});

/* ---------- long-press menu ---------- */
const MI = {
  open: '<path d="M14 4h6v6"/><path d="M20 4l-8 8"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
  canvas: '<path d="M4 20l1.2-4.4L15.8 5a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.4 18.8z"/>',
  rename: '<path d="M4 7V5h16v2"/><path d="M12 5v14"/><path d="M9 19h6"/>',
  dup: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  move: '<path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h3.6l2 2H18a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5z"/><path d="M10 13h5M13 10.5l2.5 2.5-2.5 2.5"/>',
  fav: '<path d="M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z"/>',
  home: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><path d="M16.75 14v5.5M14 16.75h5.5"/>',
  share: '<path d="M12 15V4"/><path d="M8 8l4-4 4 4"/><path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  trash: '<path d="M5 7h14"/><path d="M9 7V5h6v2"/><path d="M7 7l1 12a2 2 0 0 0 2 1.8h4a2 2 0 0 0 2-1.8l1-12"/><path d="M10 11v6M14 11v6"/>',
  newnote: '<path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z"/><path d="M12 10v6M9 13h6"/>',
  import: '<path d="M12 4v11"/><path d="M7.5 10.5L12 15l4.5-4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  sort: '<path d="M7 5v14M4 16l3 3 3-3"/><path d="M13 7h7M13 12h5M13 17h3"/>',
  ungroup: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/><path d="M14 7h3.5a2 2 0 0 1 2 2v2M10 17H6.5a2 2 0 0 1-2-2v-2" stroke-dasharray="2 2"/>',
  pin: '<path d="M9 4h6l-1 5 3 3H7l3-3z"/><path d="M12 12v8"/>',
  save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4"/><rect x="8" y="13" width="8" height="5" rx="1"/>',
  smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14a4 4 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>',
  select: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12.3l2.7 2.7L16 9.5"/>',
  back: '<path d="M15 6l-6 6 6 6"/>', chev: '<path d="M9 6l6 6-6 6"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
};
const ico = (k, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24">${MI[k]}</svg>`;
const KIND = { note: 'Handwritten note', folder: 'Folder', image: 'Image', text: 'Text file', doc: 'Document' };
let ctxState = null;
const ctxMenu = $('#ctxMenu'), ctxCatch = $('#ctxCatch');
ctxCatch.addEventListener('pointerdown', e => { e.preventDefault(); closeCtx(); });
function ctxItems(f, ctx) {
  const folder = f.kind === 'folder', note = f.kind === 'note';
  if (folder) return [
    [['rename', 'Rename', 'rename'], ['newnote', 'New note inside', 'newnote'], ['import', 'Import into folder', 'import']],
    [['icon', 'Change icon', 'smile'], ['sort', 'Sort items', 'sort', 'sub'], ['ungroup', 'Ungroup', 'ungroup'], ['move', 'Move to…', 'move', 'sub'], ['fav', f.fav ? 'Remove from Favourites' : 'Add to Favourites', 'fav']],
    [['home', 'Add to Home Screen', 'home'], ['share', 'Share folder…', 'share'], ['info', 'Get info', 'info', 'sub']],
    [['delete', !f.children.length ? 'Delete folder' : f.children.length === 1 ? 'Delete folder and 1 item' : t('Delete folder and {n} items', { n: f.children.length }), 'trash', 'danger']],
  ];
  return [
    [...(note ? [['newnote', 'New note', 'newnote'], ['save', 'Save…', 'save', 'sub']] : []), ['rename', 'Rename', 'rename'], ['dup', 'Duplicate', 'dup']],
    [['move', 'Move to…', 'move', 'sub'], ['icon', 'Change icon', 'smile'], ['fav', f.fav ? 'Remove from Favourites' : 'Add to Favourites', 'fav']],
    [['home', 'Add to Home Screen', 'home'], ['share', `Share ${note ? 'note' : 'file'}…`, 'share'], ['info', 'Get info', 'info', 'sub']],
    [['delete', `Delete ${note ? 'note' : 'file'}`, 'trash', 'danger']],
  ];
}
function kindIcon(f) { return f.kind === 'folder' ? MI.move.split('<path d="M10')[0] : f.kind === 'note' ? MI.canvas : f.kind === 'image' ? '<rect x="4" y="5" width="16" height="14" rx="2.5"/><path d="M4 16l4.5-4.5 4 4 2.5-2.5 5 5"/>' : MI.newnote.split('<path d="M12')[0]; }
function menuHead(f) { return `<button class="mhead" data-act="head" title="Open" aria-label="Open ${esc(f.name)}"><span class="k"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${kindIcon(f)}</svg></span><div><b>${esc(f.name)}</b><small>${esc(t(KIND[f.kind]))}</small></div>${ico('chev', 'go')}</button>`; }
function renderMenu(groups, head) {
  ctxMenu.innerHTML = head + groups.map(g => g.map(([act, label, icon, flag]) =>
    `<button class="mi${flag === 'danger' ? ' danger' : ''}" role="menuitem" data-act="${act}">${ico(icon)}<span>${esc(t(label))}</span>${flag === 'sub' ? ico('chev', 'chev') : ''}</button>`).join('')).join('<div class="msep"></div>');
}
function openCtx(f, ctx, el) {
  closeCtx(true); clearHover(); closePop(); closeToolPop && closeToolPop();
  ctxState = { f, ctx, el };
  el.classList.add('ctx'); ctx.container.classList.add('ctx-mode'); if (ctx === rootCtx) bringToFront('files');
  renderMenu(ctxItems(f, ctx), menuHead(f));
  ctxCatch.hidden = false; ctxMenu.hidden = false; placeCtx();
  ctxMenu.animate([{ opacity: 0, transform: 'scale(.86)' }, { opacity: 1, transform: 'none' }], { duration: SPR_OPEN.d, easing: SPR_OPEN.e });
}
function placeCtx() {
  const r = (ctxState.el.querySelector('.tile') || ctxState.el).getBoundingClientRect(), w = ctxMenu.offsetWidth, h = ctxMenu.offsetHeight;
  const right = r.right + 14 + w < vw() - 8, x = right ? r.right + 14 : Math.max(8, r.left - 14 - w), y = clamp(r.top - 4, 10, vh() - h - 10);
  ctxMenu.style.left = x + 'px'; ctxMenu.style.top = y + 'px'; ctxMenu.style.transformOrigin = `${right ? 0 : w}px ${clamp(r.top + r.height / 2 - y, 0, h)}px`;
}
function closeCtx(quick) {
  if (!ctxState) return; const { el, ctx } = ctxState; ctxState = null; ctxMenu.onclick = null;
  el.classList.remove('ctx'); ctx.container.classList.remove('ctx-mode'); ctxCatch.hidden = true;
  if (quick) { ctxMenu.hidden = true; return; }
  ctxMenu.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.94)' }], { duration: 150 }).onfinish = () => { if (!ctxState) ctxMenu.hidden = true; };
}
// every page change in the menu slides and the menu resizes smoothly
function swapMenu(build, dir) {
  const r0 = ctxMenu.getBoundingClientRect();
  build(); placeCtx();
  const r1 = ctxMenu.getBoundingClientRect();
  if (reduceMotion) return ctxMenu.animate([{ opacity: .4 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });      // Reduce Motion: a cross-fade
  ctxMenu.style.overflow = 'hidden';
  ctxMenu.animate([{ height: r0.height + 'px', transform: `translate(${r0.left - r1.left}px,${r0.top - r1.top}px)` }, { height: r1.height + 'px', transform: 'none' }],
    { duration: 440, easing: 'cubic-bezier(.32,.72,0,1)' }).onfinish = () => { ctxMenu.style.overflow = ''; };
  // the new page pushes in from the side, row after row, like an iOS menu
  [...ctxMenu.children].forEach((c, i) => c.animate([{ opacity: 0, transform: `translateX(${dir * 56}px) scale(.98)` }, { opacity: 1, transform: 'none' }],
    { duration: 420, delay: Math.min(i, 12) * 26, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'backwards' }));
}
function backToMenu() { ctxMenu.onclick = null; swapMenu(() => renderMenu(ctxItems(ctxState.f, ctxState.ctx), menuHead(ctxState.f)), -1); }
function subMenu(title, rows, onPick) {
  const tapped = ctxMenu.querySelector('.mi:focus, .mi:hover');
  if (tapped && !reduceMotion) tapped.animate([{ transform: 'scale(1)' }, { transform: 'scale(.96)' }, { transform: 'scale(1)' }], { duration: 180 });
  swapMenu(() => {
    ctxMenu.innerHTML = `<button class="mi" data-act="back">${ico('back')}<span><b>${esc(title)}</b></span></button><div class="msep"></div>` +
      rows.map(([v, label, icon, on]) => `<button class="mi" data-v="${v}">${ico(icon)}<span>${esc(label)}</span>${on ? ico('check', 'chev') : ''}</button>`).join('');
  }, 1);
  ctxMenu.onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.act === 'back') return backToMenu(); onPick(b.dataset.v); };
}
function showSave(f, ctx) {
  const copy = !f.draft, here = ctx.parent || null, locs = [null, ...[...walk(root)].filter(x => x.kind === 'folder' && x !== f)];
  let dest = null;      // on its own by default; a folder is optional
  const name0 = copy ? f.name + ' copy' : f.name === 'Untitled' ? `Note · ${f.date}` : f.name;
  swapMenu(() => {
    ctxMenu.innerHTML = `<button class="mi" data-act="back">${ico('back')}<span><b>${esc(copy ? t('Save as a new file') : t('Save note'))}</b></span></button><div class="msep"></div>
      <label class="sfield"><span>Name</span><input id="saveName" maxlength="40" value="${esc(name0)}"></label>
      <div class="slabel">${esc(t('Save in'))}</div><div class="sloc">${locs.map(l => `<button class="mi" data-loc="${l ? l.id : 'root'}">${ico('move')}<span>${esc(l ? l.name : t('On its own'))}</span><i class="tick">${ico('check', 'chev')}</i></button>`).join('')}</div>
      <div class="sact"><button class="cta" id="saveGo">${esc(t('Save'))}</button></div>`;
  }, 1);
  const mark = () => ctxMenu.querySelectorAll('[data-loc]').forEach(b => b.classList.toggle('on', b.dataset.loc === (dest ? dest.id : 'root')));
  mark();
  const inp = $('#saveName'); inp.addEventListener('pointerdown', e => e.stopPropagation()); inp.addEventListener('keydown', e => { if (e.key === 'Enter') $('#saveGo').click(); });
  ctxMenu.onclick = e => {
    if (e.target.closest('[data-act="back"]')) return backToMenu();
    const l = e.target.closest('[data-loc]'); if (l) { dest = l.dataset.loc === 'root' ? null : locs.find(x => x && x.id === l.dataset.loc); return mark(); }
    if (!e.target.closest('#saveGo')) return;
    const name = inp.value.trim() || `Note · ${f.date}`, where = dest ? dest.name : 'Files';
    closeCtx();
    if (copy) {
      const c = cloneFile(f); c.name = name; c.draft = false; c.added = Date.now();
      if (dest) { dest.children.push(c); refreshFolder(dest); } else { root.push(c); const q = quickPos('qFiles'); settleNew(makeItem(c, rootCtx, q.x, q.y, 'pop').b); }
      afterTreeChange(); toast(`Saved a copy, “${name}”, in ${where}`);
    } else {
      f.draft = false; renameFile(f, name);
      if (dest !== here) moveTo(f, ctx, dest); else refreshTile(f);
      updateMeta(); syncNoteChip(); toast(`Saved “${name}” in ${where}. Changes save on their own from now on.`);
    }
  };
  setTimeout(() => { inp.focus(); inp.select(); }, 200);
}
ctxMenu.addEventListener('click', e => {
  if (ctxMenu.onclick || !ctxState) return;
  if (e.target.closest('.mhead')) { const { f, ctx, el } = ctxState; closeCtx(); return openItem(f, ctx, el); }
  const b = e.target.closest('.mi'); if (!b) return;
  const { f, ctx, el } = ctxState, act = b.dataset.act;
  if (act === 'delete') {
    if (!b.classList.contains('arm')) { b.classList.add('arm'); b.querySelector('span').textContent = t('Tap again to delete'); b.animate([{ transform: 'scale(1)' }, { transform: 'scale(.96)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'cubic-bezier(.32,.72,0,1)' }); return; }
    closeCtx(); return deleteFile(f, ctx);
  }
  if (act === 'move') return subMenu('Move to', moveTargets(f, ctx).map(t => [t ? t.id : 'root', t ? t.name : 'Files (top level)', 'move']), v => { closeCtx(); moveTo(f, ctx, v === 'root' ? null : [...walk(root)].find(x => x.id === v)); });
  if (act === 'sort') return subMenu('Sort items', [['name', 'By name', 'sort', f.sortBy === 'name'], ['kind', 'By kind', 'sort', f.sortBy === 'kind']], v => { closeCtx(); sortFolder(f, v); });
  if (act === 'info') return showInfo(f, ctx);
  if (act === 'save') return showSave(f, ctx);
  if (act === 'icon') { closeCtx(); return openEmojiPop({ anchor: el.querySelector('.tile') || el, targets: [f] }); }
  closeCtx();
  if (act === 'open') return ctx.root ? openViewer(f, el.querySelector('.tile')) : pushView(f);
  if (act === 'canvas') { if (viewer.open) closeViewer(); return setTimeout(() => loadNote(f), viewer.open ? 140 : 0); }
  if (act === 'rename') return setTimeout(() => renameInline(f, el), 60);
  if (act === 'dup') return duplicate(f, ctx);
  if (act === 'fav') { f.fav = !f.fav; refreshTile(f); return toast(f.fav ? `Added “${f.name}” to Favourites` : `Removed from Favourites`); }
  if (act === 'newnote') return f.kind === 'folder' ? newNoteIn(f) : newNote();
  if (act === 'import') { importTarget = f; return fileInput.click(); }
  if (act === 'ungroup') return ungroup(f, ctx);
  if (act === 'home') return toast('Home Screen shortcuts are part of the iPad app. This demo can’t add one.');
  if (act === 'share') return toast('Sharing opens the iPad share sheet in the app. This demo can’t share yet.');
});
function showInfo(f, ctx) {
  const where = ctx.parent ? ctx.parent.name : t('Files');
  const rows = [[t('Kind'), t(KIND[f.kind])], [t('Size'), f.kind === 'doc' && f.size ? f.size : fmtBytes(sizeOf(f))]];
  if (f.kind === 'folder') rows.push([t('Items'), String(f.children.length)]);
  rows.push([t('Where'), where], [t('Created'), whenStr(f.added)]);
  swapMenu(() => { ctxMenu.innerHTML = `<button class="mi" data-act="back">${ico('back')}<span><b>${esc(t('Info'))}</b></span></button><div class="msep"></div><dl class="info">${rows.map(([a, b]) => `<dt>${a}</dt><dd>${esc(b)}</dd>`).join('')}</dl>`; }, 1);
  ctxMenu.onclick = e => { if (e.target.closest('[data-act="back"]')) backToMenu(); };
}
// out only on purpose: past the window's edge, or close to it while still moving outward
function wantsOut(e, b) {
  const r = panelEl.getBoundingClientRect(), m = 28;
  if (e.clientX < r.left - 6 || e.clientX > r.right + 6 || e.clientY < r.top - 6 || e.clientY > r.bottom + 6) return true;
  const sx = e.clientX < r.left + m ? -1 : e.clientX > r.right - m ? 1 : 0, sy = e.clientY < r.top + m ? -1 : e.clientY > r.bottom - m ? 1 : 0;
  return (sx && Math.sign(b.vx) === sx && Math.abs(b.vx) > 60) || (sy && Math.sign(b.vy) === sy && Math.abs(b.vy) > 60);
}
function outsidePanel(e) { const r = panelEl.getBoundingClientRect(); return e.clientX < r.left - 10 || e.clientX > r.right + 10 || e.clientY < r.top - 10 || e.clientY > r.bottom + 10; }
// the file leaves the folder under your finger: the folder closes and you keep dragging it on the desktop
function popOutOfFolder(f, ctx, e, oldEl) {
  const t = oldEl.querySelector('.tile').getBoundingClientRect(), offX = e.clientX - t.left + 8, offY = e.clientY - t.top;
  ctx.list.splice(ctx.list.indexOf(f), 1); ctx.views.delete(f.id); delete f._pos; oldEl.remove();
  root.push(f);
  const { b } = makeItem(f, rootCtx, e.clientX - offX, e.clientY - offY);
  liftItem(b.el); b.grab(); b.el.querySelector('.lift').style.transform = 'scale(1.09)';
  const pid = e.pointerId;
  const mv = ev => { if (ev.pointerId !== pid) return; b.dragTo(ev.clientX - offX, ev.clientY - offY, ev.timeStamp); hoverCheck(f, rootCtx); };
  const up = ev => {
    if (ev.pointerId !== pid) return;
    removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
    document.body.classList.remove('file-drag'); b.el.querySelector('.lift').style.transform = '';
    if (dropOn(f, rootCtx)) { b.el.classList.remove('dragging'); return; }
    const v = b.velocity(ev.timeStamp); b.release(v.x, v.y);
  };
  addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  const from = ctx.parent; afterTreeChange(); refreshFolder(from); closeViewer();
  toast(`Moved “${f.name}” out of ${from.name}`);
}
function ctxFor(f) {
  if (root.includes(f)) return rootCtx;
  const parent = [...walk(root)].find(x => x.kind === 'folder' && x.children.includes(f));
  return { parent, list: parent ? parent.children : root, views: new Map(), container: filesLayer };
}
function openItem(f, ctx, el) {      // tap a menu's header: open the file straight away, on top of everything
  if (f.kind === 'note') { const was = viewer.open; if (was) closeViewer(); return setTimeout(() => loadNote(f), was ? 140 : 0); }
  if (ctx.root || !viewer.open) return openViewer(f, (el.querySelector('.tile') || el));
  pushView(f);
}
function refreshTile(f) {
  document.querySelectorAll(`.item[data-id="${f.id}"]`).forEach(el => { el.querySelector('.tile').innerHTML = tileInner(f); el.querySelector('.label').innerHTML = labelHTML(f); });
  if (f.kind === 'note') repaintThumbs(f); setCurrentMarker();
}
function fadeOut(v) {
  if (!v) return; active.delete(v.b);
  v.el.animate([{ opacity: 1, transform: v.el.style.transform }, { opacity: 0, transform: v.el.style.transform + ' scale(.4)' }],
    { duration: 320, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).onfinish = () => v.el.remove();
}
function deleteFile(f, ctx) {
  const v = ctx.views.get(f.id);
  ctx.list.splice(ctx.list.indexOf(f), 1); ctx.views.delete(f.id); fadeOut(v);
  const gone = new Set(walk([f]));
  ghosts.filter(g => gone.has(g.f)).forEach(g => removeGhost(g, true));
  if (gone.has(current)) {
    const next = [...walk(root)].find(x => x.kind === 'note');
    if (next) loadNote(next);
    else { const n = mk.note('Untitled'); root.unshift(n); const spot = freeSpot(rootCtx, area()); makeItem(n, rootCtx, spot.x, spot.y, 'pop'); loadNote(n); }
  }
  if (ctx.layout) setTimeout(() => ctx.layout(), 200);
  afterTreeChange(); toast(`Deleted “${f.name}”`);
}
function cloneFile(f) {
  const c = JSON.parse(JSON.stringify(f, (k, v) => (k === '_pos' || k === 'undo' || k === 'redo') ? undefined : v));
  const reid = x => { x.id = nid(); if (x.kind === 'note') { x.undo = []; x.redo = []; } if (x.children) x.children.forEach(reid); };
  reid(c); c.name = f.name.replace(/(\.[a-z0-9]+)?$/i, ' copy$1'); return c;
}
function duplicate(f, ctx) {
  const c = cloneFile(f), v = ctx.views.get(f.id);
  ctx.list.splice(ctx.list.indexOf(f) + 1, 0, c); c.added = Date.now();
  if (v) { const { b } = makeItem(c, ctx, v.b.x + 16, v.b.y + 16, 'pop'); if (ctx.grid) ctx.layout(); else b.settle(); }
  else if (ctx.parent) refreshFolder(ctx.parent);
  afterTreeChange(); toast(`Made “${c.name}”`);
  if (f.kind === 'note' && f === current && !W.canvas.min && !fullKey) return loadNote(c, { force: true });      // both stay on screen
  if (viewer.open && viewer.stack[viewer.stack.length - 1] === f) { const cv = ctx.views.get(c.id); openViewer(c, cv ? cv.el.querySelector('.tile') : panelEl); }
}
function moveTargets(f, ctx) {
  const inside = new Set(walk([f])), out = [];
  if (ctx.parent) out.push(null);
  for (const x of walk(root)) if (x.kind === 'folder' && !inside.has(x) && x !== ctx.parent) out.push(x);
  return out;
}
function moveTo(f, ctx, dest) {
  ctx.list.splice(ctx.list.indexOf(f), 1); fadeOut(ctx.views.get(f.id)); ctx.views.delete(f.id); delete f._pos;
  if (dest) { dest.children.push(f); refreshFolder(dest); }
  else { root.push(f); const q = quickPos('qFiles'); settleNew(makeItem(f, rootCtx, q.x, q.y, 'pop').b); }
  if (ctx.layout) setTimeout(() => ctx.layout(), 200);
  afterTreeChange(); toast(`Moved “${f.name}” to ${dest ? dest.name : 'Files'}`);
}
function sortFolder(f, by) {
  f.sortBy = by; const order = { folder: 0, note: 1, image: 2, text: 3, doc: 4 };
  f.children.sort((a, b) => by === 'kind' ? (order[a.kind] - order[b.kind]) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
  refreshFolder(f); if (viewer.open && viewer.stack[viewer.stack.length - 1] === f) renderView(0);
  toast(`Sorted ${f.name} by ${by}`);
}
function ungroup(f, ctx) {
  const v = ctx.views.get(f.id), x = v ? v.b.x : 0, y = v ? v.b.y : 0, kids = f.children.slice();
  ctx.list.splice(ctx.list.indexOf(f), 1, ...kids); ctx.views.delete(f.id); fadeOut(v);
  kids.forEach((c, i) => {
    delete c._pos; const { b } = makeItem(c, ctx, x, y, 'pop');
    if (!ctx.grid) { const a = i / Math.max(1, kids.length) * Math.PI * 2; b.vx = Math.cos(a) * 320; b.vy = Math.sin(a) * 320; b.settle(); }
  });
  if (ctx.grid) ctx.layout();
  afterTreeChange(); toast(kids.length ? `Ungrouped ${kids.length} item${kids.length > 1 ? 's' : ''}` : 'Removed the empty folder');
}
function newNoteIn(folder) {
  const n = Object.assign(mk.note('Untitled', [], todayStr, current.mood, 'grid'), { draft: true });
  folder.children.unshift(n); refreshFolder(folder); afterTreeChange();
  if (viewer.open) closeViewer();
  setTimeout(() => loadNote(n), 150); toast(`New note in ${folder.name}`);
}
let importTarget = null;

document.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') return;
  const b = e.target.closest && e.target.closest('button, [role="button"], .cd, .hab, .chip');
  if (!b || b.matches('.minibtn, input')) return;
  try { b.setPointerCapture(e.pointerId); } catch (_) {}
}, true);
let palmUntil = 0;
document.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch' || e.target.closest('#sheet')) return;
  if ((ink && ink.type === 'pen') || (e.timeStamp - lastPen < 300 && (e.width > 24 || e.height > 24))) { palmUntil = e.timeStamp + 500; e.stopPropagation(); e.preventDefault(); }
}, true);
document.addEventListener('click', e => { if (e.timeStamp < palmUntil) { e.stopPropagation(); e.preventDefault(); } }, true);
/* sliders: tap anywhere on the track to jump there, keep dragging to fine-tune (finger or Apple Pencil) */
document.addEventListener('pointerdown', e => {
  const r = e.target.closest && e.target.closest('input[type=range]'); if (!r) return;
  e.preventDefault(); try { r.setPointerCapture(e.pointerId); } catch (_) {}
  const set = ev => {
    const b = r.getBoundingClientRect(), t = clamp((ev.clientX - b.left - 11) / Math.max(1, b.width - 22), 0, 1), min = +r.min, max = +r.max, step = +r.step || 1;
    const v = +(Math.round((min + t * (max - min)) / step) * step).toFixed(3); if (+r.value !== v) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); }
  };
  set(e);
  const mv = ev => { if (ev.pointerId === e.pointerId) set(ev); };
  const up = ev => { if (ev.pointerId !== e.pointerId) return; r.removeEventListener('pointermove', mv); r.removeEventListener('pointerup', up); r.removeEventListener('pointercancel', up); };
  r.addEventListener('pointermove', mv); r.addEventListener('pointerup', up); r.addEventListener('pointercancel', up);
}, true);

/* ---------- selecting files: long-press the background ---------- */
const selSet = new Set(); let selecting = false;
const bgAnchor = document.createElement('div'); bgAnchor.id = 'bgAnchor'; document.body.append(bgAnchor);
function isBackground(t) { return t === document.body || t === document.documentElement || (t.closest && (t.closest('#field') || t.id === 'files')); }
document.addEventListener('pointerdown', e => {
  if (!isBackground(e.target) || ctxState || emojiOpen) return;
  const sx = e.clientX, sy = e.clientY;
  const t = setTimeout(() => openBgMenu(sx, sy), 550);
  const done = () => { clearTimeout(t); removeEventListener('pointermove', mv); removeEventListener('pointerup', done); removeEventListener('pointercancel', done); };
  const mv = ev => { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 10) done(); };
  addEventListener('pointermove', mv); addEventListener('pointerup', done); addEventListener('pointercancel', done);
});
document.addEventListener('contextmenu', e => { if (isBackground(e.target)) { e.preventDefault(); openBgMenu(e.clientX, e.clientY); } });
function openBgMenu(x, y) {
  closeCtx(true); closePop(); closeToolPop();
  Object.assign(bgAnchor.style, { left: x + 'px', top: y + 'px' });
  ctxState = { f: null, ctx: rootCtx, el: bgAnchor, bg: true };
  const rows = [['select', 'Select files', 'select'], ['icons', 'Change file icons', 'smile'], ['newfolder', 'New folder', 'move'], ['tidy', 'Tidy up', 'sort']];
  ctxMenu.innerHTML = `<div class="mhead"><span class="k"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h3.6l2 2H18a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5z"/></svg></span><div><b>Files</b><small>${root.length} on this screen</small></div></div>`
    + rows.slice(0, 2).map(([a, l, i]) => `<button class="mi" data-bg="${a}">${ico(i)}<span>${esc(t(l))}</span></button>`).join('') + '<div class="msep"></div>'
    + rows.slice(2).map(([a, l, i]) => `<button class="mi" data-bg="${a}">${ico(i)}<span>${esc(t(l))}</span></button>`).join('')
    + '<p class="tip" style="padding:6px 12px 8px">' + esc(t('Select files to group them into a folder, delete them or give them an emoji icon.')) + '</p>';
  ctxMenu.onclick = e => {
    const b = e.target.closest('[data-bg]'); if (!b) return; const a = b.dataset.bg; closeCtx();
    if (a === 'select') startSelect();
    if (a === 'icons') { startSelect(); toast('Tap the files to change, then tap Change icon'); }
    if (a === 'newfolder') {
      const fo = mk.folder('New folder', []); root.push(fo);
      makeItem(fo, rootCtx, clamp(x - 40, 0, vw() - 80), clamp(y - 40, 0, vh() - 100), 'pop');
      if (fullKey === 'files') fullGrid(); if (railOn) enterRail(); afterTreeChange(); toast('New folder. Double-tap its name to rename it.');
    }
    if (a === 'tidy') { if (fullKey === 'files') return fullGrid(true); fileTargets().forEach((t, i) => setTimeout(() => t.b.springTo(t.x, t.y, null, 200, 24), i * 18)); }
  };
  ctxCatch.hidden = false; ctxMenu.hidden = false; placeCtx();
  ctxMenu.animate([{ opacity: 0, transform: 'scale(.86)' }, { opacity: 1, transform: 'none' }], { duration: SPR_OPEN.d, easing: SPR_OPEN.e });
}
// tapping anywhere that isn't a file (or the bar for the selection) finishes selecting; the same for a lasso selection
document.addEventListener('pointerdown', e => {
  const t = e.target;
  if (selecting && !t.closest('#files .item, #railList .item, #selBar, #emojiPop, #ctxMenu, #ctxCatch')) endSelect();
  if (sel && !t.closest('#sheet, #dock, #toolPop')) clearSel();
}, true);
function startSelect() {
  closeViewer(); selecting = true; selSet.clear(); document.body.classList.add('selecting'); syncSelBar(); toast('Tap files to pick them. Tap empty space when you’re finished.');
  const sb = $('#selBar'); sb.hidden = false; sb.animate([{ opacity: 0, transform: 'translate(-50%, 16px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], { duration: SPR_OPEN.d, easing: SPR_OPEN.e });
}
function endSelect() {
  if (!selecting) return; selecting = false; selSet.clear(); document.body.classList.remove('selecting');
  document.querySelectorAll('.item.picked').forEach(x => x.classList.remove('picked'));
  const sb = $('#selBar'); sb.animate([{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%, 12px)' }], { duration: 200 }).onfinish = () => { if (!selecting) sb.hidden = true; };
}
function togglePick(f, el) {
  selSet.has(f) ? selSet.delete(f) : selSet.add(f); el.classList.toggle('picked', selSet.has(f));
  el.querySelector('.tile').animate([{ transform: 'scale(.9)' }, { transform: 'scale(1.04)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.32,.72,0,1)' }); syncSelBar();
}
function syncSelBar() {
  const n = selSet.size; $('#selCount').textContent = n ? t('{n} selected', { n }) : t('Select files');
  $('#sbGroup').disabled = n < 2; $('#sbIcon').disabled = !n; $('#sbDel').disabled = !n;
  const d = $('#sbDel'); d.classList.remove('arm'); d.querySelector('span').textContent = t('Delete');
}
$('#sbIcon').addEventListener('click', () => openEmojiPop({ anchor: $('#sbIcon'), targets: root.filter(f => selSet.has(f)) }));
$('#sbDel').addEventListener('click', () => {
  const d = $('#sbDel'), list = root.filter(f => selSet.has(f));
  if (!d.classList.contains('arm')) { d.classList.add('arm'); d.querySelector('span').textContent = t('Delete {n}?', { n: list.length }); return; }
  list.forEach(f => deleteFile(f, rootCtx)); endSelect(); toast(`Deleted ${list.length} file${list.length > 1 ? 's' : ''}`);
});
$('#sbGroup').addEventListener('click', () => {
  const list = root.filter(f => selSet.has(f)); if (list.length < 2) return;
  const v0 = rootCtx.views.get(list[0].id), x = v0.b.x, y = v0.b.y;
  const same = list.every(f => f.kind === list[0].kind), folder = mk.folder(same ? suggestName(list[0], list[1]) : 'New folder', list.slice());
  root.splice(root.indexOf(list[0]), 0, folder);
  list.forEach(f => { root.splice(root.indexOf(f), 1); const v = rootCtx.views.get(f.id); if (v) { flyInto(v, x, y); rootCtx.views.delete(f.id); } delete f._pos; });
  setTimeout(() => { makeItem(folder, rootCtx, x, y, 'pop'); if (fullKey === 'files') fullGrid(); if (railOn) enterRail(); }, 240);
  endSelect(); afterTreeChange(); toast(`Grouped ${list.length} files into “${folder.name}”. Double-tap the name to rename it.`);
});
addEventListener('keydown', e => { if (e.key === 'Escape' && selecting && !emojiOpen && !ctxState) endSelect(); });

/* ---------- the left column of files (while a window sits at 75%) ---------- */
let railOn = false, railHeld = false, canvas75 = false;
function syncRail() { const want = !fullKey && ((viewer.open && viewer.mode === 'win75') || canvas75); want ? enterRail() : exitRail(); }
function railOrder() {
  const rank = f => f.kind === 'folder' ? 0 : f.kind === 'note' && (f.draft || f.name === 'Untitled') ? 1 : 2;
  return root.map((f, i) => [rank(f), i, f]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[2]);
}
function railDivider() {
  const list = $('#railList'); list.querySelectorAll('.rdiv').forEach(d => d.remove());
  const items = [...list.querySelectorAll(':scope > .item')], ids = new Map(root.map(f => [f.id, f]));
  const firstFile = items.findIndex(el => (ids.get(el.dataset.id) || {}).kind !== 'folder');
  if (firstFile > 0) { const d = document.createElement('hr'); d.className = 'rdiv'; d.setAttribute('aria-hidden', 'true'); list.insertBefore(d, items[firstFile]); }
}
function enterRail() {
  const list = $('#railList'), rail = $('#rail'), views = railOrder().map(f => rootCtx.views.get(f.id)).filter(Boolean);
  if (railOn) { views.forEach(v => { v.el.classList.add('inrail'); active.delete(v.b); list.append(v.el); }); railDivider(); return; }
  railOn = true; rail.hidden = false; saved.free = new Map(views.map(v => [v.f.id, { x: v.b.x, y: v.b.y }]));
  const first = views.map(v => v.el.getBoundingClientRect());
  views.forEach(v => { active.delete(v.b); v.el.classList.add('inrail'); list.append(v.el); }); railDivider();
  if (viewer.origin) viewer.origin.style.visibility = '';
  rail.animate([{ opacity: 0, transform: 'translateX(-24px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.32,.72,0,1)' });
  views.forEach((v, i) => { const r = v.el.getBoundingClientRect(), a = first[i];
    v.el.animate([{ translate: `${a.left - r.left}px ${a.top - r.top}px` }, { translate: '0px 0px' }], { duration: SPR_OPEN.d + i * 18, easing: SPR_OPEN.e }); });
}
function exitRail() {
  if (!railOn) return; railOn = false;
  const rail = $('#rail'), views = root.map(f => rootCtx.views.get(f.id)).filter(Boolean);
  const first = views.map(v => v.el.getBoundingClientRect());
  views.forEach((v, i) => { v.el.classList.remove('inrail'); filesLayer.append(v.el); v.b.place(first[i].left, first[i].top); });
  rail.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(-24px) scale(.96)' }], { duration: 300, easing: 'cubic-bezier(.32,.72,0,1)' }).onfinish = () => { if (!railOn) rail.hidden = true; };
  if (viewer.open && viewer.origin) viewer.origin.style.visibility = 'hidden';
  views.forEach((v, i) => { const q = saved.free && saved.free.get(v.f.id); if (q) setTimeout(() => v.b.springTo(q.x, q.y, null, 190, 26), i * 14); else settleNew(v.b); });
}

/* the window or file you touch rises above everything else; the rest drop back a layer */
const layerOrder = ['sheet', 'filesHdr', 'topbar', 'panelPos'];
let liftedItem = null;
function liftItem(el) { if (liftedItem && liftedItem !== el) liftedItem.style.zIndex = ''; liftedItem = el; el.style.zIndex = '47'; }
function dropItem() { if (liftedItem) { liftedItem.style.zIndex = ''; liftedItem = null; } }
function bringToFront(id) {
  if (!layerOrder.includes(id)) return;
  dropItem();
  if (layerOrder[layerOrder.length - 1] === id) return;
  layerOrder.splice(layerOrder.indexOf(id), 1); layerOrder.push(id);
  layerOrder.forEach((k, j) => { $('#' + k).style.zIndex = 20 + j * 3; $('#' + k).classList.toggle('front', j === layerOrder.length - 1); });
}
layerOrder.forEach(k => $('#' + k).addEventListener('pointerdown', () => bringToFront(k), true));
layerOrder.forEach((k, j) => { $('#' + k).style.zIndex = 20 + j * 3; });
document.addEventListener('touchmove', e => { if (peekArmed || !e.target.closest('pre, .view.scroll, .escroll, #ctxMenu, .dayview, #rail, .rlist2')) e.preventDefault(); }, { passive: false });
['gesturestart', 'gesturechange'].forEach(t => document.addEventListener(t, e => e.preventDefault()));
document.addEventListener('contextmenu', e => { if (!e.target.closest('input, pre')) e.preventDefault(); });

/* ---------- boot ---------- */
function seedCreated() {
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], now = Date.now(), y = new Date().getFullYear(); let i = 0;
  for (const f of walk(root)) {
    if (f === current) continue; i++;
    const m = /(\d{1,2}) (\w{3})$/.exec(f.date || '');
    if (m && MON.includes(m[2])) f.added = Math.min(new Date(y, MON.indexOf(m[2]), +m[1], 9 + (i % 9), (i * 17) % 60).getTime(), now - i * 6e4);
    else { const d = new Date(now - (2 + i) * 864e5); d.setHours(9 + (i * 5) % 10, (i * 23) % 60, 0, 0); f.added = d.getTime(); }
  }
}
function boot() {
  seedCreated();
  home = computeHome();
  sheet = new Body(sheetEl, { x: home.x, y: home.y + 40, s: home.s * .96, tiltK: 0, bounds: sheetBounds });
  sheet.onScaleSettled = () => sizeCanvases();
  sizeCanvases(true);
  draggable(sheet, $('#grip'), { accept: () => fullKey !== 'split', moveStart: () => unsnap('sheet'), move: e => snapHover(e.clientX, e.clientY), end: e => { const z = takeSnapHint(); if (z) { snapTo('sheet', z); return false; } }, tap: () => { if (fullKey === 'canvas') return; canvas75 = false; syncRail(); sheet.springTo(home.x, home.y, home.s, 180, 22); } });

  const topBody = new Body($('#topbar'), { tiltK: 0, raise: false, bounds: () => { const r = $('#topWin'); return { minX: 6, maxX: vw() - r.offsetWidth - 6, minY: 6, maxY: vh() - r.offsetHeight - 6 }; } });
  draggable(topBody, $('#topDrag'), { accept: () => fullKey !== 'today' }); draggable(topBody, $('#topDrag2'), { accept: () => fullKey !== 'today', tap: () => enterFull('today') });

  const dockWin = $('#dock .win');
  const dk = new Body(dock, { tiltK: 0, raise: false, bounds: () => ({ minX: 6, maxX: vw() - dockWin.offsetWidth - 6, minY: 6, maxY: vh() - dockWin.offsetHeight - 6 }) });
  // the whole bar moves: grab any edge, gap or the handle; buttons keep working
  let foldedByDrag = false;
  const midEdge = (x, y) => (x < 80 || x > vw() - 80) && Math.abs(y - vh() / 2) < vh() * .2;      // the middle of the left or right edge
  const inCorner = (x, y) => { const C = 140; return ((x < C || x > vw() - C) && (y < C || y > vh() - C)) || midEdge(x, y); };
  // fold or unfold mid-drag: the shape morphs smoothly and stays centred under the finger
  function foldMidDrag(on, e) {
    if (dock.classList.contains('circle') === on) return;
    closeToolPop();
    morph(dockWin, () => { dock.classList.toggle('circle', on); if (on) dock.classList.remove('vert'); }, { spr: SPR_OPEN });
    const w = dockWin.offsetWidth, h = dockWin.offsetHeight, x = e.clientX - w / 2, y = e.clientY - h / 2;
    dk.rebase(x, y, e.clientX, e.clientY); dk.dragTo(x, y, e.timeStamp);
    if (!on) syncDock(true);
  }
  draggable(dk, dockWin, { accept: e => dockMode === 'float' && vw() > 600 && !dock.classList.contains('circle') && !e.target.closest('button, .tools, .sizes, input, .minibtn, .rn'),
    down: () => { dock.classList.add('dragging'); foldedByDrag = false; }, up: () => dock.classList.remove('dragging'),
    move: e => { const c = inCorner(e.clientX, e.clientY);
      if (c && !dock.classList.contains('circle')) { foldedByDrag = true; foldMidDrag(true, e); }
      else if (!c && foldedByDrag && dock.classList.contains('circle')) { foldedByDrag = false; foldMidDrag(false, e); } },
    end: e => dockDrop(e.clientX, e.clientY) });
  // drop it at a side and it turns vertical along that edge; drag it back to the middle and it lies flat again
  draggable(dk, $('#miniBtn'), { tap: () => setDockMini(false), end: e => dockDrop(e.clientX, e.clientY) });

  const hdr = new Body($('#filesHdr'), { tiltK: 0, raise: false, bounds: () => ({ minX: 4, maxX: vw() - 120, minY: 60, maxY: vh() - 60 }) });
  draggable(hdr, $('#filesWin'), { tap: () => { if (filesState.piled) toggleFilesPile(); } });

  groups.add({ skip: () => filesState.piled || filesLayer.hidden || railOn || fullKey === 'files', bodies: allFileBodies,
    obstacles: () => { const o = [];
      if (!W.files.min && !W.files.outer.hidden) o.push({ x: W.files.body.x, y: W.files.body.y, w: $('#filesWin').offsetWidth, h: $('#filesWin').offsetHeight + 6 });
      for (const [win, host] of [['#dock .win', 'dock'], ['#topWin', 'topbar']]) {      // the toolbar and the top bar are solid too
        const hostEl = $('#' + host); if (hostEl.hidden || getComputedStyle(hostEl).opacity < .5) continue;
        const r = $(win).getBoundingClientRect(); if (r.width) o.push({ x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 });
      }
      return o; } });
  W = {
    today: { outer: $('#topbar'), inner: $('#topWin'), body: topBody },
    canvas: { outer: sheetEl, inner: sheetWin, body: sheet },
    tools: { outer: dock, inner: dockWin, body: dk },
    files: { outer: $('#filesHdr'), inner: $('#filesWin'), body: hdr },
  };
  centerTop(false);
  $('#topbar').animate([{ opacity: 0, transform: `translate3d(${topBody.x}px,-30px,0)` }, { opacity: 1, transform: `translate3d(${topBody.x}px,${topBody.y}px,0)` }], { duration: SPR_SOFT.d, easing: SPR_SOFT.e });

  // the toolbar lives at the centre of one side: flat along the top or bottom, upright along the left or right
  const placeDock = spring => {
    const side = dockSide, vert = side === 'left' || side === 'right', circle = dock.classList.contains('circle');
    dock.classList.toggle('clockleft', circle && (dockCorner ? dockCorner[1] === 'r' : side === 'right'));      // the clock sits on the side with room
    if (!circle) dock.classList.toggle('vert', vert);
    const w = dockWin.offsetWidth, h = dockWin.offsetHeight, tb = $('#topWin').getBoundingClientRect(), m = 12;
    let x = (vw() - w) / 2, y = (vh() - h) / 2;
    if (circle && dockCorner) { x = dockCorner[1] === 'l' ? 16 : vw() - w - 16; y = dockCorner[0] === 't' ? 16 : dockCorner[0] === 'm' ? (vh() - h) / 2 : vh() - h - 16; }
    else if (side === 'bottom') y = vh() - h - m;
    else if (side === 'top') { const tbBottom = topBody.y + $('#topWin').offsetHeight; y = (tbBottom < vh() / 2 ? tbBottom : 0) + 10; }      // where the top bar settles, not where its entrance animation is
    else x = side === 'left' ? m : vw() - w - m;
    x = clamp(x, 6, vw() - w - 6); y = clamp(y, 6, vh() - h - 6);
    spring ? dk.springTo(x, y, null, 190, 24) : (dk.place(x, y + (side === 'bottom' ? 30 : 0)), dk.springTo(x, y, null, 120, 16));
  };
  // drop it anywhere: it goes to the side your finger is closest to
  function dockDrop(px, py) {
    const C = 140; let cx = px < C ? 'l' : px > vw() - C ? 'r' : '', cy = py < C ? 't' : py > vh() - C ? 'b' : '';
    if (!(cx && cy) && midEdge(px, py)) { cx = px < vw() / 2 ? 'l' : 'r'; cy = 'm'; }      // folds at the middle of a side edge too
    if (cx && cy) {          // a corner: fold into a circle there
      closeToolPop(); dockCorner = cy + cx;
      if (!dock.classList.contains('circle')) setDockMini(true); else placeDock(true);
      return false;
    }
    dockCorner = null;
    const d = { top: py / vh(), bottom: (vh() - py) / vh(), left: px / vw(), right: (vw() - px) / vw() };
    const side = Object.keys(d).reduce((a, b) => d[a] <= d[b] ? a : b);
    closeToolPop();
    if (side !== dockSide) {
      dockSide = side; try { localStorage.setItem('olaa-dock-side', side); } catch (_) {}
      if (!dock.classList.contains('circle')) morph(dockWin, () => dock.classList.toggle('vert', side === 'left' || side === 'right'), { spr: SPR_OPEN });
      syncDock(true); home = computeHome(); if (!fullKey && !W.canvas.min && !canvas75) sheet.springTo(home.x, home.y, home.s, 160, 20); if (!filesState.piled && !railOn && fullKey !== 'files') fileTargets().forEach(t => t.b.springTo(t.x, t.y, null, 170, 22));
    }
    placeDock(true); return false;
  }
  relayoutDock = placeDock;
  placeDock(false);
  syncDock(true);

  const a = area(), hh = filesHdrHome();
  hdr.place(hh.x + 40, hh.y); hdr.springTo(hh.x, hh.y, null, 140, 18);
  $('#qNew').addEventListener('click', newNote);
  $('#qImport').addEventListener('click', () => fileInput.click());
  $('#qFiles').addEventListener('click', () => fullKey === 'files' ? exitFull() : enterFull('files'));
  const r = rng(4);
  root.forEach(f => makeItem(f, rootCtx, a.x + a.w + 40, a.y + r() * a.h));
  fileTargets().forEach((t, i) => {
    if (reduceMotion) return t.b.place(t.x, t.y);
    setTimeout(() => t.b.springTo(t.x, t.y, null, 120 + i * 4, 15), 120 + i * 55);
  });
  sheet.springTo(home.x, home.y, home.s, 140, 18);
  renderQuick(); syncMoodBtn(); applyPalette(MOODS[1].c); setCurrentMarker(); noteChanged(); updateCount(); renderToday(); syncLights(); centerTop(false);
  paper.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: 'ease-out' });

  let rt = 0;
  addEventListener('resize', () => {
    clearTimeout(rt); rt = setTimeout(() => {
      if (fullKey) exitFull();
      const prev = home; home = computeHome();
      if (Math.abs(sheet.x - prev.x) < 2 && Math.abs(sheet.y - prev.y) < 2) sheet.springTo(home.x, home.y, home.s); else sheet.settle();
      placeDock(true); centerTop(true); if (split) setTimeout(layoutSplit, 400); if (Object.keys(snap.slots).length) setTimeout(() => applySnap(true), 400);
      const h2 = filesHdrHome(); hdr.springTo(h2.x, h2.y);
      if (!filesState.piled) fileTargets().forEach(t => t.b.springTo(t.x, t.y, null, 150, 18));
      const mp = moodsEl.querySelector('.mood[aria-pressed="true"]'); if (mp && !moodsEl.hidden) slidePill(moodPill, mp, true);
      syncDock(true); setTimeout(() => sizeCanvases(), 500);
    }, 120);
  });
}
collectI18n(); applyLang();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot();
})();

/* installable app: work offline once opened (https or localhost only) */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

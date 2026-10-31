/** Optional visual layer for the cultivation theme.
 * The image files are deliberately not committed until public redistribution rights are confirmed.
 * If a matching file is present locally, the app uses it; otherwise the layout falls back to CSS.
 */
export const VISUAL_ASSETS = [
  {id:'01', file:'assets/visuals/calligraphy-01.webp', title:'书法并置', caption:'墨与金的书法细节', placement:'gallery'},
  {id:'02', file:'assets/visuals/calligraphy-02.webp', title:'深色书法', caption:'深色背景上的金色笔触', placement:'training'},
  {id:'03', file:'assets/visuals/archive-03.webp', title:'修炼典籍', caption:'典籍文字图像，仅作世界观画卷', placement:'gallery'},
  {id:'04', file:'assets/visuals/calligraphy-04.webp', title:'水墨分隔', caption:'浅墨与留白', placement:'training'},
  {id:'05', file:'assets/visuals/quote-05.webp', title:'阶段语录', caption:'阶段总结用语录图', placement:'progress'},
  {id:'06', file:'assets/visuals/archive-06.webp', title:'前世经历', caption:'可展开查看的修炼故事', placement:'gallery'},
  {id:'07', file:'assets/visuals/portrait-07.webp', title:'成长画像', caption:'进度页的安静人物装饰', placement:'progress'},
  {id:'08', file:'assets/visuals/portrait-08.webp', title:'人物画卷', caption:'世界观画卷中的人物卡', placement:'gallery'},
  {id:'09', file:'assets/visuals/hero-09.webp', title:'山水仙鹤', caption:'首页主视觉', placement:'hero'}
];

export const VISUAL_ASSET_NOTICE = '用户提供的素材仅在确认公开使用授权后部署；缺少文件时自动使用 CSS 水墨留白。';

export function visualAsset(id) {
  return VISUAL_ASSETS.find(asset => asset.id === id) || null;
}

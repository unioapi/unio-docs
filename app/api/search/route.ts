import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
import { createTokenizer } from '@orama/tokenizers/mandarin';

export const { GET } = createFromSource(source, {
  localeMap: {
    // 中文需要专用分词器，默认分词按空格切分对中文无效。
    cn: {
      components: {
        tokenizer: createTokenizer(),
      },
      search: {
        threshold: 0,
        tolerance: 0,
      },
    },
    en: { language: 'english' },
  },
});

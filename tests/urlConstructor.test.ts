import { UrlConstructor } from '../src/generators/urlConstructor';
import { SynapseConfig } from '../src/types/config';

describe('UrlConstructor', () => {
  it('appends query params for plain base URLs', () => {
    const config: SynapseConfig = {
      name: 't',
      baseUrl: 'https://api.example.com/search',
      execution: { mode: 'construct', iterations: 1 }
    };
    const url = new UrlConstructor(config).constructUrl([
      { name: 'q', value: 'hello world' },
      { name: 'page', value: 2 }
    ]);
    expect(url).toContain('q=hello');
    expect(url).toContain('page=2');
  });

  it('substitutes path placeholders', () => {
    const config: SynapseConfig = {
      name: 't',
      baseUrl: 'https://api.example.com/users/{userId}/posts/{postId}',
      execution: { mode: 'construct', iterations: 1 }
    };
    const url = new UrlConstructor(config).constructUrl([
      { name: 'userId', value: 42 },
      { name: 'postId', value: 7 },
      { name: 'expand', value: 'true' }
    ]);
    expect(url).toContain('/users/42/posts/7');
    expect(url).toContain('expand=true');
    expect(url).not.toContain('{userId}');
  });
});

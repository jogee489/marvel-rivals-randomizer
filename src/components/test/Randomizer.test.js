import { render } from '@testing-library/vue'
import randomizer from '../Randomizer.vue'
import { assert } from 'vitest';

test('it should work', () => {
  const { getByText } = render(randomizer, {
    props: {
      /* ... */
    }
  })

  // assert output
  getByText('...')
}),

test('assign roles for players', () => {
  assert;
});

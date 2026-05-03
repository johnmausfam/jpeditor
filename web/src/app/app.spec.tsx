import { render } from '@testing-library/react';
import App from './app';

describe('App', () => {
  it('should render the editor layout', () => {
    const { baseElement } = render(<App />);
    expect(baseElement).toBeTruthy();
  });
});

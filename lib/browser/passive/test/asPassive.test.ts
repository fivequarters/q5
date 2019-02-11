import { asPassive, setSupport } from '../src/asPassive';

describe('asPassive', () => {
  describe('if passive is supported', () => {
    it('should return an object with passive enabled', () => {
      setSupport(true);
      expect(asPassive()).toEqual({ passive: true });
    });

    it('should include other options that we passed in and passive enabled', () => {
      setSupport(true);
      expect(asPassive({ option2: false })).toEqual({ passive: true, option2: false });
    });
  });

  describe('if passive is not supported', () => {
    it('should return false', () => {
      setSupport(false);
      expect(asPassive()).toEqual(false);
    });

    it('should include only the other options that we passed in', () => {
      setSupport(false);
      expect(asPassive({ option2: false })).toEqual({ option2: false });
    });
  });
});

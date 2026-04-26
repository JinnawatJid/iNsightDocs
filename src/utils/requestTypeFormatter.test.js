import { describe, it, expect } from 'vitest';
import { formatRequestType } from './requestTypeFormatter';

describe('formatRequestType', () => {
    it('returns original if combineEnabled is false', () => {
        expect(formatRequestType('เครดิตเพิ่ม,เปลี่ยนแปลงระยะเวลาเครดิต', false)).toBe('เครดิตเพิ่ม,เปลี่ยนแปลงระยะเวลาเครดิต');
    });

    it('returns original if empty', () => {
        expect(formatRequestType('', true)).toBe('');
        expect(formatRequestType(null, true)).toBe('');
    });

    it('combines specific types if combineEnabled is true', () => {
        expect(formatRequestType('เครดิตเพิ่ม', true)).toBe('เปลี่ยนแปลงเงื่อนไขเครดิต');
        expect(formatRequestType('เครดิตเพิ่ม,เปลี่ยนแปลงระยะเวลาเครดิต', true)).toBe('เปลี่ยนแปลงเงื่อนไขเครดิต');
        expect(formatRequestType('เปลี่ยนแปลงเงื่อนไขการชำระเงิน', true)).toBe('เปลี่ยนแปลงเงื่อนไขเครดิต');
    });

    it('keeps other types but combines combinable ones', () => {
        expect(formatRequestType('เครดิตใหม่,เครดิตเพิ่ม', true)).toBe('เครดิตใหม่,เปลี่ยนแปลงเงื่อนไขเครดิต');
        expect(formatRequestType('เครดิตโครงการ', true)).toBe('เครดิตโครงการ');
    });
});

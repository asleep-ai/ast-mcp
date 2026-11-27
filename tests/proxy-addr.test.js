const proxyaddr = require('proxy-addr');

describe('trusted proxy subnet boundaries', () => {
  const request = {
    socket: { remoteAddress: '192.0.2.1' },
    headers: { 'x-forwarded-for': '10.1.2.3' },
  };

  test.each(['::ffff:10.0.0.0/8', '::/1'])(
    '%s does not let an external client forge its source address',
    (subnet) => {
      expect(proxyaddr(request, proxyaddr.compile(subnet))).toBe('192.0.2.1');
    },
  );

  test.each(['10.0.0.0/8', '::ffff:10.0.0.0/104'])(
    '%s still accepts a forwarded address from the trusted IPv4 subnet',
    (subnet) => {
      const trustedRequest = {
        ...request,
        socket: { remoteAddress: '10.2.3.4' },
      };
      expect(proxyaddr(trustedRequest, proxyaddr.compile(subnet))).toBe('10.1.2.3');
    },
  );
});

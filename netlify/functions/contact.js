/**
 * Netlify Serverless Function: /api/contact
 * Handles contact form submissions, listing, status update, & deletion on Netlify.
 */

let initialSubmissions = [];
try {
  initialSubmissions = require('../../data/submissions.json');
} catch (e) {
  initialSubmissions = [];
}

let submissionsCache = Array.isArray(initialSubmissions) ? [...initialSubmissions] : [];

// Helper default service names
const getServiceName = (serviceType, customName) => {
  if (customName && customName.trim() !== '') return customName.trim();
  switch ((serviceType || '').toLowerCase()) {
    case 'lpk':
      return 'LPK Buwas Ikigai Nusantara';
    case 'procool':
      return 'Procool';
    case 'legal':
      return 'Konsultasi Hukum';
    case 'geoteknik':
      return 'Jasa Geoteknik';
    default:
      return 'Buwas Ikigai Nusantara';
  }
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // 1. Handle CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Extract path and ID if present (e.g. /api/contact/1788238840242)
  const pathParts = (event.path || '').split('/').filter(Boolean);
  const contactIndex = pathParts.lastIndexOf('contact');
  const targetId = (contactIndex !== -1 && pathParts.length > contactIndex + 1)
    ? pathParts[contactIndex + 1]
    : null;

  // 2. Handle POST /api/contact (Submit form)
  if (event.httpMethod === 'POST') {
    try {
      let data = {};
      const headersMap = event.headers || {};
      const contentType = headersMap['content-type'] || headersMap['Content-Type'] || '';

      if (event.body) {
        if (contentType.includes('application/x-www-form-urlencoded')) {
          const params = new URLSearchParams(event.body);
          for (const [key, value] of params.entries()) {
            data[key] = value;
          }
        } else {
          try {
            data = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
          } catch (e) {
            data = {};
          }
        }
      }

      const name = (data.name || '').trim();
      const phone = (data.phone || '').trim();
      const email = (data.email || '').trim();
      const program = (data.program || data.service || '').trim();
      const message = (data.message || '').trim();
      const serviceType = (data.serviceType || 'procool').toLowerCase();
      const serviceName = getServiceName(serviceType, data.serviceName);

      // Mandatory validation
      if (!name) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Kolom Nama Lengkap wajib diisi' })
        };
      }

      if (!phone) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Kolom Nomor Telepon / WhatsApp wajib diisi' })
        };
      }

      if (!program) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Pilihan layanan / program wajib dipilih' })
        };
      }

      if (!message) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Kolom Pesan / detail kebutuhan wajib diisi' })
        };
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Format email tidak valid' })
        };
      }

      const nowIso = new Date().toISOString();
      const newSubmission = {
        id: Date.now().toString(),
        name,
        email,
        phone,
        program,
        message,
        serviceType,
        serviceName,
        status: 'new',
        read: false,
        submittedAt: nowIso,
        createdAt: nowIso
      };

      submissionsCache.unshift(newSubmission);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          message: 'Pesan berhasil dikirim',
          data: newSubmission
        })
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: 'Terjadi kesalahan sistem saat mengirim pesan', error: err.message })
      };
    }
  }

  // 3. Handle GET /api/contact (List submissions)
  if (event.httpMethod === 'GET') {
    const query = event.queryStringParameters || {};
    let results = [...submissionsCache];

    if (query.serviceType && query.serviceType !== 'all') {
      const f = query.serviceType.toLowerCase();
      results = results.filter(s => (s.serviceType || '').toLowerCase() === f);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    };
  }

  // 4. Handle PUT /api/contact/:id (Update status)
  if (event.httpMethod === 'PUT' && targetId) {
    try {
      const body = event.body ? JSON.parse(event.body) : {};
      const sub = submissionsCache.find(s => s.id === targetId);
      if (sub) {
        if (body.status) sub.status = body.status;
        if (body.status === 'read' || body.status === 'in_progress' || body.status === 'completed') {
          sub.read = true;
        }
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Status berhasil diperbarui', data: sub })
      };
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Gagal memperbarui status' })
      };
    }
  }

  // 5. Handle DELETE /api/contact/:id (Delete submission)
  if (event.httpMethod === 'DELETE' && targetId) {
    submissionsCache = submissionsCache.filter(s => s.id !== targetId);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Pesan berhasil dihapus' })
    };
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ message: 'Method Not Allowed' })
  };
};

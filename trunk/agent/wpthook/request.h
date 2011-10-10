/******************************************************************************
Copyright (c) 2010, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, 
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the <ORGANIZATION> nor the names of its contributors 
    may be used to endorse or promote products derived from this software 
    without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE 
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER 
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, 
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
******************************************************************************/

#pragma once

class TestState;
class TrackSockets;
class TrackDns;
class WptTest;

class DataChunk {
public:
  DataChunk() { _value = new DataChunkValue(NULL, NULL, 0); }
  DataChunk(const char * unowned_data, DWORD data_len) {
    _value = new DataChunkValue(unowned_data, NULL, data_len);
  }
  DataChunk(const DataChunk& src): _value(src._value) { ++_value->_ref_count; }
  ~DataChunk() { if (--_value->_ref_count == 0) delete _value; }
  const DataChunk& operator=(const DataChunk& src) {
    if (_value != src._value) {
      if (--_value->_ref_count == 0) {
        delete _value;
      }
      _value = src._value;
      ++_value->_ref_count;
    }
    return *this;
  }
  void CopyDataIfUnowned() {
    if (_value->_unowned_data) {
      DWORD len = _value->_data_len;
      char *new_data = new char[len];
      memcpy(new_data, _value->_unowned_data, len);
      _value->_unowned_data = NULL;
      _value->_data = new_data;
      _value->_data_len = len;    }
  }
  char * AllocateLength(DWORD len) {
    if (--_value->_ref_count == 0) {
      delete _value;
    }
    _value = new DataChunkValue(NULL, new char[len], len);
    return _value->_data;
  }
  const char * GetData() {
    return _value->_data ? _value->_data : _value->_unowned_data;
  }
  DWORD GetLength() { return _value->_data_len; }

private:
  class DataChunkValue {
   public:
    const char * _unowned_data;
    char *       _data;
    DWORD        _data_len;
    int          _ref_count;
    DataChunkValue(const char * unowned_data, char * data, DWORD data_len) :
        _unowned_data(unowned_data), _data(data), _data_len(data_len),
        _ref_count(1) {
      _unowned_data = unowned_data;
      _data = data;
      _data_len = data_len;
    }
    ~DataChunkValue() { delete [] _data; }
  };
  DataChunkValue * _value;
};

class HeaderField {
public:
  HeaderField(CStringA fn, CStringA value): _field_name(fn), _value(value) {}
  HeaderField(const HeaderField& src){*this = src;}
  ~HeaderField(){}
  const HeaderField& operator=(const HeaderField& src) {
    _field_name = src._field_name;
    _value = src._value;
    return src;
  }
  bool Matches(const CStringA& field_name) {
    return _field_name.CompareNoCase(field_name) == 0;
  }

  CStringA  _field_name;
  CStringA  _value;
};

typedef CAtlList<HeaderField> Fields;

class HttpData {
 public:
  HttpData(): _data(NULL), _data_size(0) {}
  ~HttpData() { delete _data; }

  CStringA GetHeaders() { CopyData(); return _headers; }
  DWORD GetDataSize() { return _data_size; }

  void AddChunk(DataChunk& chunk);
  CStringA GetHeader(CStringA field_name);

protected:
  void CopyData();
  void ExtractHeaderFields();

  CAtlList<DataChunk> _data_chunks;
  const char * _data;
  DWORD _data_size;
  CStringA _headers;
  Fields _header_fields;
};

class RequestData : public HttpData {
 public:
   CStringA GetMethod() { ProcessRequestLine(); return _method; }
   CStringA GetObject() { ProcessRequestLine(); return _object; }

 private:
   void ProcessRequestLine();

   CStringA _method;
   CStringA _object;
};

class ResponseData : public HttpData {
 public:
  ResponseData(): HttpData(), _result(-2), _protocol_version(-1.0) {}

  int GetResult() { ProcessStatusLine(); return _result; }
  double GetProtocolVersion() { ProcessStatusLine(); return _protocol_version;}
  DataChunk GetBody() { Dechunk(); return _body; }
private:
  void ProcessStatusLine();
  void Dechunk();

  DataChunk _body;
  int       _result;
  double    _protocol_version;
};

class OptimizationScores {
public:
  OptimizationScores():
    _keep_alive_score(-1)
    , _gzip_score(-1)
    , _gzip_total(0)
    , _gzip_target(0)
    , _image_compression_score(-1)
    , _image_compress_total(0)
    , _image_compress_target(0)
    , _cache_score(-1)
    , _cache_time_secs(-1)
    , _combine_score(-1)
    , _static_cdn_score(-1)
  {}
  ~OptimizationScores() {}
  int _keep_alive_score;
  int _gzip_score;
  DWORD _gzip_total;
  DWORD _gzip_target;
  int _image_compression_score;
  DWORD _image_compress_total;
  DWORD _image_compress_target;
  int _cache_score;
  DWORD _cache_time_secs;
  int _combine_score;
  int _static_cdn_score;
  CStringA _cdn_provider;
};

class Request {
public:
  Request(TestState& test_state, DWORD socket_id,
          TrackSockets& sockets, TrackDns& dns, WptTest& test);
  ~Request(void);

  void DataIn(DataChunk& chunk);
  bool ModifyDataOut(DataChunk& chunk);
  void DataOut(DataChunk& chunk);
  void SocketClosed();

  bool Process();
  CStringA GetRequestHeader(CStringA header);
  CStringA GetResponseHeader(CStringA header);
  bool IsStatic();
  bool IsText();
  int GetResult();
  CStringA GetHost();
  CStringA GetMime();
  LARGE_INTEGER GetStartTime();
  void GetExpiresTime(long& age_in_seconds, bool& exp_present,
                      bool& cache_control_present);
  ULONG GetPeerAddress();

  bool  _processed;
  DWORD _socket_id;
  ULONG _peer_address;
  bool  _is_ssl;

  RequestData  _request_data;
  ResponseData _response_data;

  // Times in ms from the test start.
  int _ms_start;
  int _ms_first_byte;
  int _ms_end;
  int _ms_connect_start;
  int _ms_connect_end;
  int _ms_dns_start;
  int _ms_dns_end;
  int _ms_ssl_start;
  int _ms_ssl_end;

  // performance counter times
  LARGE_INTEGER _start;
  LARGE_INTEGER _first_byte;
  LARGE_INTEGER _end;

  OptimizationScores _scores;

private:
  TestState&    _test_state;
  WptTest&      _test;
  TrackSockets& _sockets;
  TrackDns&     _dns;

  CRITICAL_SECTION cs;
  bool _is_active;
  bool _are_headers_complete;
};

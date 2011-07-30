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

class WptHook;
class WptTestHook;
class HookChrome;

class TestServer
{
public:
  TestServer(WptHook& hook, WptTestHook &test, HookChrome& chrome_hook);
  ~TestServer(void);

  bool Start(void);
  void Stop(void);
  void MongooseCallback(enum mg_event event,
                        struct mg_connection *conn,
                        const struct mg_request_info *request_info);

private:
  WptHook&          _hook;
  HookChrome&       _chrome_hook;
  struct mg_context *_mongoose_context;
  WptTestHook&      _test;
  CRITICAL_SECTION  cs;

  void SendResponse(struct mg_connection *conn,
                    const struct mg_request_info *request_info,
                    DWORD response_code,
                    CStringA response_code_string,
                    CStringA response_data);
  DWORD ParseLoadTime(CStringA query_string);
  void ParseDOMElementLoadTime(CStringA query_string, CStringA& dom_element, DWORD& time);
};

# Generated by the protocol buffer compiler.  DO NOT EDIT!
# source: message.proto

import sys
_b=sys.version_info[0]<3 and (lambda x:x) or (lambda x:x.encode('latin1'))
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from google.protobuf import reflection as _reflection
from google.protobuf import symbol_database as _symbol_database
from google.protobuf import descriptor_pb2
# @@protoc_insertion_point(imports)

_sym_db = _symbol_database.Default()




DESCRIPTOR = _descriptor.FileDescriptor(
  name='message.proto',
  package='',
  serialized_pb=_b('\n\rmessage.proto\"D\n\tMsgClient\x12\x0f\n\x07message\x18\x01 \x02(\t\x12\x11\n\tother_uid\x18\x02 \x02(\t\x12\x13\n\x0bselect_type\x18\x03 \x02(\t')
)
_sym_db.RegisterFileDescriptor(DESCRIPTOR)




_MSGCLIENT = _descriptor.Descriptor(
  name='MsgClient',
  full_name='MsgClient',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='message', full_name='MsgClient.message', index=0,
      number=1, type=9, cpp_type=9, label=2,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
    _descriptor.FieldDescriptor(
      name='other_uid', full_name='MsgClient.other_uid', index=1,
      number=2, type=9, cpp_type=9, label=2,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
    _descriptor.FieldDescriptor(
      name='select_type', full_name='MsgClient.select_type', index=2,
      number=3, type=9, cpp_type=9, label=2,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      options=None),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  options=None,
  is_extendable=False,
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=17,
  serialized_end=85,
)

DESCRIPTOR.message_types_by_name['MsgClient'] = _MSGCLIENT

MsgClient = _reflection.GeneratedProtocolMessageType('MsgClient', (_message.Message,), dict(
  DESCRIPTOR = _MSGCLIENT,
  __module__ = 'message_pb2'
  # @@protoc_insertion_point(class_scope:MsgClient)
  ))
_sym_db.RegisterMessage(MsgClient)


# @@protoc_insertion_point(module_scope)

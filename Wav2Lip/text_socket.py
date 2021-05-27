# receives text from terminal and puts it into a socket
import socket
import argparse
import zlib
import struct

parser = argparse.ArgumentParser(description='Code for forwarding text ovre a socket.')

parser.add_argument('--HOST', default='popeye2.stanford.edu',
                    help='host you are trying to transfer text to. Keep it blank if running the code on same machine as'
                         ' the one recording text input.')
parser.add_argument('-ip', '--PORT', default=50007,
                    help='port for forwarding the text data')

args = parser.parse_args()
HOST = args.HOST
PORT = int(args.PORT)
print(HOST)
print(PORT)

# connect to server
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect((HOST, PORT))

line = None
compress = False
while True:
    line = input("Enter text to be converted. Enter ESC if want to quit.\n")
    if line == 'ESC':
        break
    # add a newline character for server to know to generate audio till this point
    line = line + '\n'
    if not compress:
        s.send(line.encode('UTF-8'))
    else:
        # try compressing the string
        line = line.encode('UTF-8')
        print('To compress')
        print(line)

        z = zlib.compressobj()

        gzip_compressed_data = z.compress(line) + z.flush()
        gzlen = len(gzip_compressed_data)

        print('Compressed')
        print(gzip_compressed_data)

        s.send(gzip_compressed_data)
s.close()


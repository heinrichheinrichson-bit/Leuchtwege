package com.heinrichheinrichson.leuchtwege;
import java.io.*;
import java.nio.ByteBuffer;
import java.nio.charset.*;
public final class BackupFileCodec {
    public static final int LIMIT=32000000;
    public static String read(InputStream in) throws IOException {
        ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int n;
        while((n=in.read(buffer))!=-1){if(out.size()+n>LIMIT)throw new IOException("Backup too large");out.write(buffer,0,n);}
        return StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(out.toByteArray())).toString();
    }
}

package com.heinrichheinrichson.leuchtwege;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
public class BackupFileCodecTest {
    @Test public void preservesUnicodeExactly() throws Exception {String text="{\"name\":\"Schöne Wege ❄\",\"xp\":1234}";assertEquals(text,BackupFileCodec.read(new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8))));}
    @Test(expected=IOException.class) public void rejectsBrokenEncoding() throws Exception {BackupFileCodec.read(new ByteArrayInputStream(new byte[]{(byte)0xc3,0x28}));}
    @Test(expected=IOException.class) public void rejectsOversizedFile() throws Exception {BackupFileCodec.read(new InputStream(){int left=BackupFileCodec.LIMIT+1;public int read(){return left-->0?32:-1;}public int read(byte[] b,int off,int len){if(left<=0)return -1;int n=Math.min(left,len);java.util.Arrays.fill(b,off,off+n,(byte)32);left-=n;return n;}});}
}

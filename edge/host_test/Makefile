FW = ../firmware/you_yourself_edge
CFLAGS = -std=c11 -O2 -Wall -Wextra -D_DEFAULT_SOURCE -I$(FW)

test: test_core vectors.csv vad_audio.f32
	./test_core

test_core: test_core.c $(FW)/yy_core.c $(FW)/yy_core.h $(FW)/emg_model.h
	$(CC) $(CFLAGS) -o $@ test_core.c $(FW)/yy_core.c -lm

vectors.csv $(FW)/emg_model.h:
	cd ../python && python3 train_emg.py --synthetic

vad_audio.f32:
	python3 gen_vad_vectors.py

clean:
	rm -f test_core vad_audio.f32 vad_expected.txt

.PHONY: test clean

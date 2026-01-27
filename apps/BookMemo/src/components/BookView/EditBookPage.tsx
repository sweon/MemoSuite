import React, { useState, useEffect } from 'react';
import { useLanguage } from '@memosuite/shared';
import styled from 'styled-components';
import { db } from '../../db';
import { FiCheck, FiCalendar, FiArrowLeft } from 'react-icons/fi';
import { format } from 'date-fns';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px 32px;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    padding: 16px 16px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.5rem;

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.text};
    font-weight: 700;
    font-size: 1.5rem;
  }
`;

const BackButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  transition: all 0.2s;
  
  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: ${({ theme }) => theme.colors.surface};
  padding: 2rem;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  flex: 1;
  justify-content: flex-start;

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.85rem;
  padding-right: 2.5rem;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary}22;
  }

  &::-webkit-calendar-picker-indicator {
    position: absolute;
    right: 0.75rem;
    width: 1.5rem;
    height: 1.5rem;
    cursor: pointer;
    opacity: 0;
    z-index: 2;
  }
`;

const CalendarIcon = styled(FiCalendar)`
  position: absolute;
  right: 0.75rem;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 1.2rem;
  pointer-events: none;
  z-index: 1;
`;

const Button = styled.button`
  padding: 1rem;
  border-radius: 10px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  margin-top: 1rem;
  transition: all 0.2s;
  box-shadow: 0 4px 12px ${({ theme }) => theme.colors.primary}44;

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
    box-shadow: 0 6px 15px ${({ theme }) => theme.colors.primary}66;
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    font-size: 1.2rem;
    stroke-width: 2.5;
  }
`;

const formatDateForInput = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const EditBookPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const book = useLiveQuery(() => db.books.get(Number(bookId)), [bookId]);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [startDate, setStartDate] = useState('');

  useEffect(() => {
    if (book) {
      setTitle(book.title);
      setAuthor(book.author || '');
      setTotalPages(String(book.totalPages));
      setStartDate(
        language === 'ko'
          ? format(book.startDate, 'yyyy. MM. dd.')
          : formatDateForInput(book.startDate)
      );
    }
  }, [book, language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !totalPages || !book) return;

    let parsedDate: Date;
    if (language === 'ko' && /^\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.?$/.test(startDate)) {
      const parts = startDate.split('.').map(s => s.trim()).filter(Boolean);
      parsedDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      parsedDate = new Date(startDate + 'T00:00:00');
    }

    if (isNaN(parsedDate.getTime())) {
      parsedDate = book.startDate;
    }

    try {
      await db.books.update(book.id!, {
        title: title.trim(),
        author: author.trim(),
        totalPages: parseInt(totalPages, 10),
        startDate: parsedDate,
        updatedAt: new Date()
      });
      navigate(`/book/${book.id}`, { replace: true });
    } catch (error) {
      console.error('Failed to update book:', error);
      alert('Failed to update book');
    }
  };

  const handleBack = () => {
    navigate(`/book/${bookId}`);
  };

  if (!book) {
    return <Container><p>{t.memo_detail.loading}</p></Container>;
  }

  return (
    <Container>
      <Header>
        <BackButton onClick={handleBack}>
          <FiArrowLeft size={16} />
          {language === 'ko' ? `${book.title}(으)로` : `Back to ${book.title}`}
        </BackButton>
      </Header>
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label>{t.book_detail.title}</Label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t.book_detail.title}
            required
            autoFocus
          />
        </FormGroup>
        <FormGroup>
          <Label>{t.book_detail.author_label}</Label>
          <Input
            value={author}
            onChange={e => setAuthor(e.target.value)}
            placeholder={t.book_detail.author_label}
          />
        </FormGroup>
        <FormGroup>
          <Label>{t.book_detail.pages}</Label>
          <Input
            type="number"
            value={totalPages}
            onChange={e => setTotalPages(e.target.value)}
            placeholder={t.book_detail.pages}
            required
            min="1"
          />
        </FormGroup>
        <FormGroup>
          <Label>{t.book_detail.started}</Label>
          <InputWrapper>
            <Input
              type={language === 'ko' ? 'text' : 'date'}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              placeholder={language === 'ko' ? 'YYYY. MM. DD.' : undefined}
              required
            />
            <CalendarIcon onClick={() => {
              const hiddenInput = document.getElementById('hidden-date-picker-edit');
              if (hiddenInput) {
                (hiddenInput as any).showPicker?.() || hiddenInput.click();
              }
            }} style={{ cursor: 'pointer', pointerEvents: 'auto' }} />
            {language === 'ko' && (
              <input
                id="hidden-date-picker-edit"
                type="date"
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: 0,
                  height: 0,
                  padding: 0,
                  border: 'none'
                }}
                onChange={(e) => {
                  const d = new Date(e.target.value);
                  if (!isNaN(d.getTime())) {
                    setStartDate(format(d, 'yyyy. MM. dd.'));
                  }
                }}
              />
            )}
          </InputWrapper>
        </FormGroup>
        <Button type="submit">
          <FiCheck /> {language === 'ko' ? '저장' : 'Save'}
        </Button>
      </Form>
    </Container>
  );
};
